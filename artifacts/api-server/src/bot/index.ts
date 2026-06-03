import { Telegraf, Markup, session } from "telegraf";
import { db, usersTable, tasksTable, taskCompletionsTable, withdrawalsTable, settingsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  generateReferralCode,
  MIN_WITHDRAWAL_POINTS,
  POINTS_PER_REFERRAL,
  calcUserPoints,
  calcAdminPoints,
  pointsToUsdt,
  formatUsdt,
  TRUSTED_SITES,
} from "./helpers.js";
import { mainKeyboard, adminKeyboard } from "./keyboards.js";
import {
  welcomeMessage,
  balanceMessage,
  noTasksMessage,
  taskMessage,
  referralMessage,
  commissionInfoMessage,
  helpMessage,
} from "./messages.js";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ADMIN_ID = process.env["ADMIN_TELEGRAM_ID"]
  ? Number(process.env["ADMIN_TELEGRAM_ID"])
  : null;

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");

export const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ===== تهيئة الإعدادات الافتراضية =====
async function initSettings() {
  const defaults = [
    { key: "points_per_usdt", value: "1000", description: "عدد النقاط لكل دولار USDT" },
    { key: "user_commission", value: "70", description: "نسبة المستخدم %" },
    { key: "admin_commission", value: "30", description: "نسبة المدير %" },
    { key: "min_withdrawal", value: "1000", description: "الحد الأدنى للسحب بالنقاط" },
  ];
  for (const s of defaults) {
    const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, s.key)).limit(1);
    if (!existing) {
      await db.insert(settingsTable).values(s);
    }
  }
}

// ===== تهيئة المهام الافتراضية من المواقع الموثوقة =====
async function seedTrustedTasks() {
  const [existing] = await db.select({ count: count() }).from(tasksTable);
  if (existing.count > 0) return;

  for (const site of TRUSTED_SITES) {
    const usdtVal = parseFloat(site.usdtValue);
    await db.insert(tasksTable).values({
      title: site.title,
      description: site.description,
      type: site.type,
      url: site.url,
      source: site.source,
      usdtValue: site.usdtValue,
      rewardPoints: calcUserPoints(usdtVal),
      adminPoints: calcAdminPoints(usdtVal),
      active: true,
    });
  }
  logger.info("Seeded trusted tasks");
}

// ===== مساعدات =====
async function getOrCreateUser(
  telegramId: number,
  firstName?: string,
  lastName?: string,
  username?: string,
  referralCode?: string,
) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  if (existing) return { user: existing, isNew: false };

  let referredById: number | undefined;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
    if (referrer && referrer.telegramId !== telegramId) {
      referredById = referrer.id;
      await db.update(usersTable).set({ points: referrer.points + POINTS_PER_REFERRAL }).where(eq(usersTable.id, referrer.id));
    }
  }

  const code = generateReferralCode();
  const [newUser] = await db.insert(usersTable).values({
    telegramId, firstName, lastName, username,
    referralCode: code,
    referredBy: referredById ?? null,
  }).returning();

  return { user: newUser, isNew: true };
}

function isAdmin(telegramId: number): boolean {
  return ADMIN_ID !== null && telegramId === ADMIN_ID;
}

// ===== /start =====
bot.command("help", async (ctx) => {
  await ctx.reply(helpMessage(), { parse_mode: "Markdown" });
});

bot.start(async (ctx) => {
  try {
    const { user, isNew } = await getOrCreateUser(
      ctx.from.id, ctx.from.first_name, ctx.from.last_name, ctx.from.username, ctx.startPayload || undefined,
    );
    const keyboard = isAdmin(ctx.from.id) ? adminKeyboard : mainKeyboard;
    await ctx.reply(welcomeMessage(user, isNew), { parse_mode: "Markdown", ...keyboard });
  } catch (err) {
    logger.error({ err }, "Error in /start");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== رصيدي =====
bot.hears("💰 رصيدي", async (ctx) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }

    const [{ count: referralCount }] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.referredBy, user.id));
    await ctx.reply(balanceMessage(user.points, referralCount), { parse_mode: "Markdown" });
  } catch (err) {
    logger.error({ err }, "Error in balance");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== المهام =====
bot.hears("📋 المهام", async (ctx) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }

    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.active, true));
    if (tasks.length === 0) { await ctx.reply(noTasksMessage()); return; }

    const completions = await db.select().from(taskCompletionsTable).where(eq(taskCompletionsTable.userId, user.id));
    const completedIds = new Set(completions.map((c) => c.taskId));

    await ctx.reply(`📋 *المهام المتاحة* (${tasks.length} مهمة)\n\n💡 أنجز المهمة على الموقع ثم اضغط "أنجزت المهمة" لاستلام نقاطك.`, { parse_mode: "Markdown" });

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const done = completedIds.has(task.id);
      const text = taskMessage(task, i + 1, tasks.length, done);

      if (!done) {
        const rows = [];
        if (task.url) rows.push([Markup.button.url("🔗 افتح الموقع", task.url)]);
        rows.push([Markup.button.callback("✅ أنجزت المهمة", `complete_${task.id}`)]);
        await ctx.reply(text, { parse_mode: "Markdown", ...Markup.inlineKeyboard(rows) });
      } else {
        await ctx.reply(text, { parse_mode: "Markdown" });
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in tasks");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== إنجاز مهمة =====
bot.action(/^complete_(\d+)$/, async (ctx) => {
  try {
    const taskId = Number(ctx.match[1]);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.answerCbQuery("❌ يرجى كتابة /start أولاً."); return; }

    const [task] = await db.select().from(tasksTable).where(and(eq(tasksTable.id, taskId), eq(tasksTable.active, true))).limit(1);
    if (!task) { await ctx.answerCbQuery("❌ المهمة غير موجودة."); return; }

    const [existing] = await db.select().from(taskCompletionsTable)
      .where(and(eq(taskCompletionsTable.userId, user.id), eq(taskCompletionsTable.taskId, taskId))).limit(1);
    if (existing) { await ctx.answerCbQuery("⚠️ أنجزت هذه المهمة مسبقاً."); return; }

    await db.insert(taskCompletionsTable).values({ userId: user.id, taskId });
    await db.update(usersTable).set({ points: user.points + task.rewardPoints }).where(eq(usersTable.id, user.id));

    const usdtEarned = formatUsdt(pointsToUsdt(task.rewardPoints));
    await ctx.answerCbQuery(`🎉 ربحت ${task.rewardPoints} نقطة!`);
    await ctx.editMessageText(
      `✅ *${task.title}* — مكتملة\n\n🏆 ربحت: *${task.rewardPoints}* نقطة\n💵 القيمة: *${usdtEarned}$ USDT*\n\nرصيدك الجديد: *${user.points + task.rewardPoints}* نقطة`,
      { parse_mode: "Markdown" },
    );
  } catch (err) {
    logger.error({ err }, "Error completing task");
    await ctx.answerCbQuery("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== شاهد إعلانات =====
bot.hears("📺 شاهد إعلانات", async (ctx) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }

    const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim() ?? "localhost";
    const earnUrl = `https://${domain}/api/earn/${user.referralCode}`;

    await ctx.reply(
      `📺 *شاهد إعلانات واكسب نقاطاً تلقائياً!*\n\n` +
      `⚡ النقاط تُضاف *فوراً* بعد كل إنجاز — بدون أي ضغط.\n\n` +
      `🌐 *الشبكات المتاحة:*\n` +
      `• ⚡ CPAlead — موافقة فورية\n` +
      `• 🔥 Torox\n` +
      `• 🏆 AdGate Media\n` +
      `• 💎 Offertoro\n` +
      `• 🎮 Lootably\n\n` +
      `💡 كلما أنجزت أكثر، كسبت أكثر 💰`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.url("🚀 افتح صفحة الإعلانات", earnUrl)]]),
      },
    );
  } catch (err) {
    logger.error({ err }, "Error in earn page");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== الإحالة =====
bot.hears("👥 الإحالة", async (ctx) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }

    const botInfo = await bot.telegram.getMe();
    const [{ count: referralCount }] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.referredBy, user.id));
    await ctx.reply(referralMessage(user.referralCode, botInfo.username ?? "", referralCount), { parse_mode: "Markdown" });
  } catch (err) {
    logger.error({ err }, "Error in referral");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== إحصائياتي =====
bot.hears("📊 إحصائياتي", async (ctx) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }

    const [{ count: completedCount }] = await db.select({ count: count() }).from(taskCompletionsTable).where(eq(taskCompletionsTable.userId, user.id));
    const [{ count: referralCount }] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.referredBy, user.id));
    const [{ count: withdrawalCount }] = await db.select({ count: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.userId, user.id));

    const name = user.firstName ?? user.username ?? "أنت";
    const usdt = formatUsdt(pointsToUsdt(user.points));
    await ctx.reply(
      `📊 *إحصائيات ${name}*\n\n` +
      `🪙 الرصيد: *${user.points.toLocaleString()}* نقطة\n` +
      `💵 القيمة: *${usdt}$ USDT*\n` +
      `✅ المهام المنجزة: *${completedCount}*\n` +
      `👥 الأصدقاء المدعوون: *${referralCount}*\n` +
      `💸 طلبات السحب: *${withdrawalCount}*\n\n` +
      `📅 عضو منذ: ${user.createdAt.toLocaleDateString("ar-SA")}`,
      { parse_mode: "Markdown" },
    );
  } catch (err) {
    logger.error({ err }, "Error in stats");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

// ===== نظام العمولة =====
bot.hears("📈 نظام النقاط", async (ctx) => {
  await ctx.reply(commissionInfoMessage(), { parse_mode: "Markdown" });
});

// ===== السحب =====
const withdrawState = new Map<number, { method: string } | "awaiting_method">();

bot.hears("💸 سحب", async (ctx) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, ctx.from.id)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }

    if (user.points < MIN_WITHDRAWAL_POINTS) {
      await ctx.reply(
        `❌ رصيدك غير كافٍ للسحب.\n\n` +
        `🪙 رصيدك: *${user.points.toLocaleString()}* نقطة (${formatUsdt(pointsToUsdt(user.points))}$)\n` +
        `⚠️ الحد الأدنى: *1,000* نقطة = *1$ USDT*\n\n` +
        `أكمل المزيد من المهام لتصل للحد الأدنى! 💪`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    withdrawState.set(ctx.from.id, "awaiting_method");
    const usdtVal = formatUsdt(pointsToUsdt(user.points));
    await ctx.reply(
      `💸 *طلب سحب*\n\n` +
      `🪙 رصيدك: *${user.points.toLocaleString()}* نقطة\n` +
      `💵 القيمة: *${usdtVal}$ USDT*\n\n` +
      `اختر طريقة السحب:`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("💎 USDT (TRC20)", "withdraw_usdt"), Markup.button.callback("💳 PayPal", "withdraw_paypal")],
          [Markup.button.callback("❌ إلغاء", "withdraw_cancel")],
        ]),
      },
    );
  } catch (err) {
    logger.error({ err }, "Error in withdraw");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

bot.action(/^withdraw_(usdt|paypal|cancel)$/, async (ctx) => {
  const method = ctx.match[1];
  if (method === "cancel") {
    withdrawState.delete(ctx.from.id);
    await ctx.editMessageText("❌ تم إلغاء طلب السحب.");
    await ctx.answerCbQuery();
    return;
  }
  withdrawState.set(ctx.from.id, { method });
  const methodName = method === "usdt" ? "USDT (TRC20)" : "PayPal";
  await ctx.editMessageText(`✅ اخترت: *${methodName}*\n\nأرسل عنوان المحفظة أو البريد الإلكتروني:`, { parse_mode: "Markdown" });
  await ctx.answerCbQuery();
});

// ===== لوحة الإدارة =====
bot.hears("🔧 لوحة الإدارة", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const [{ count: userCount }] = await db.select({ count: count() }).from(usersTable);
  const [{ count: taskCount }] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.active, true));
  const [{ count: pendingCount }] = await db.select({ count: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));

  await ctx.reply(
    `🔧 *لوحة الإدارة*\n\n` +
    `👥 المستخدمون: *${userCount}*\n` +
    `📋 المهام النشطة: *${taskCount}*\n` +
    `⏳ طلبات السحب المعلقة: *${pendingCount}*\n\n` +
    `الأوامر:\n` +
    `/addtask — إضافة مهمة (بقيمة USDT)\n` +
    `/pendingwithdrawals — طلبات السحب\n` +
    `/broadcast — رسالة جماعية\n` +
    `/adminstats — إحصائيات المنصة`,
    { parse_mode: "Markdown" },
  );
});

bot.command("adminstats", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const [{ count: userCount }] = await db.select({ count: count() }).from(usersTable);
  const [{ count: completionsCount }] = await db.select({ count: count() }).from(taskCompletionsTable);
  const [{ count: pendingCount }] = await db.select({ count: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));
  const [{ count: approvedCount }] = await db.select({ count: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "approved"));

  const tasks = await db.select({ adminPoints: tasksTable.adminPoints }).from(tasksTable);
  const totalAdminEarnings = tasks.reduce((sum, t) => sum + (t.adminPoints ?? 0), 0);

  await ctx.reply(
    `📊 *إحصائيات المنصة*\n\n` +
    `👥 إجمالي المستخدمين: *${userCount}*\n` +
    `✅ إجمالي المهام المنجزة: *${completionsCount}*\n` +
    `⏳ طلبات سحب معلقة: *${pendingCount}*\n` +
    `✔️ طلبات سحب موافق عليها: *${approvedCount}*\n\n` +
    `💰 *أرباح المنصة الإجمالية (30%):*\n` +
    `🪙 *${totalAdminEarnings.toLocaleString()}* نقطة\n` +
    `💵 ≈ *${formatUsdt(pointsToUsdt(totalAdminEarnings))}$ USDT*`,
    { parse_mode: "Markdown" },
  );
});

// ===== إضافة مهمة جديدة =====
type AddTaskStep = "title" | "description" | "type" | "url" | "usdt_value";
type AddTaskState = { step: AddTaskStep; title?: string; description?: string; type?: string; url?: string };
const addTaskState = new Map<number, AddTaskState>();

bot.command("addtask", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  addTaskState.set(ctx.from.id, { step: "title" });
  await ctx.reply(
    `➕ *إضافة مهمة جديدة*\n\n` +
    `💡 النظام يحسب تلقائياً:\n• 70% نقاط للمستخدم\n• 30% ربح لك\n\nأرسل عنوان المهمة:`,
    { parse_mode: "Markdown" },
  );
});

bot.command("pendingwithdrawals", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const pending = await db.select({ w: withdrawalsTable, u: usersTable })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.status, "pending"))
    .limit(10);

  if (pending.length === 0) { await ctx.reply("✅ لا توجد طلبات سحب معلقة."); return; }

  for (const { w, u } of pending) {
    const userName = u?.firstName ?? u?.username ?? `ID:${u?.telegramId}`;
    const usdtVal = formatUsdt(pointsToUsdt(w.points));
    await ctx.reply(
      `💸 *طلب سحب #${w.id}*\n` +
      `👤 المستخدم: ${userName}\n` +
      `🪙 النقاط: *${w.points.toLocaleString()}*\n` +
      `💵 القيمة: *${usdtVal}$ USDT*\n` +
      `💳 الطريقة: ${w.method}\n` +
      `📬 العنوان: \`${w.address}\``,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[
          Markup.button.callback("✅ قبول", `approve_${w.id}`),
          Markup.button.callback("❌ رفض", `reject_${w.id}`),
        ]]),
      },
    );
  }
});

bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("⛔ غير مصرح لك."); return; }

  const action = ctx.match[1];
  const withdrawalId = Number(ctx.match[2]);
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, withdrawalId)).limit(1);
  if (!withdrawal) { await ctx.answerCbQuery("❌ الطلب غير موجود."); return; }

  const newStatus = action === "approve" ? "approved" : "rejected";
  await db.update(withdrawalsTable).set({ status: newStatus }).where(eq(withdrawalsTable.id, withdrawalId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, withdrawal.userId)).limit(1);
  if (user) {
    if (action === "reject") {
      await db.update(usersTable).set({ points: user.points + withdrawal.points }).where(eq(usersTable.id, user.id));
      try {
        await bot.telegram.sendMessage(user.telegramId,
          `❌ *تم رفض طلب سحبك*\n\nتم إعادة *${withdrawal.points.toLocaleString()}* نقطة إلى رصيدك.`,
          { parse_mode: "Markdown" });
      } catch (_) {}
    } else {
      try {
        await bot.telegram.sendMessage(user.telegramId,
          `✅ *تمت الموافقة على طلب سحبك*\n\n💵 ${formatUsdt(pointsToUsdt(withdrawal.points))}$ USDT\nسيتم التحويل قريباً. شكراً! 🙏`,
          { parse_mode: "Markdown" });
      } catch (_) {}
    }
  }

  const label = action === "approve" ? "✅ تمت الموافقة" : "❌ تم الرفض";
  await ctx.editMessageText(`${label} — طلب #${withdrawalId}`);
  await ctx.answerCbQuery(label);
});

const broadcastStep = new Map<number, boolean>();
bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  broadcastStep.set(ctx.from.id, true);
  await ctx.reply("📢 أرسل الرسالة التي تريد بثها لجميع المستخدمين:");
});

// ===== معالج النصوص العامة =====
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  // بث رسائل المدير
  if (broadcastStep.get(userId) && isAdmin(userId)) {
    broadcastStep.delete(userId);
    const users = await db.select({ telegramId: usersTable.telegramId }).from(usersTable);
    let sent = 0;
    for (const u of users) {
      try { await bot.telegram.sendMessage(u.telegramId, text, { parse_mode: "Markdown" }); sent++; } catch (_) {}
    }
    await ctx.reply(`✅ تم إرسال الرسالة لـ ${sent} مستخدم.`);
    return;
  }

  // إضافة مهمة جديدة
  const addTask = addTaskState.get(userId);
  if (addTask && isAdmin(userId)) {
    if (addTask.step === "title") {
      addTaskState.set(userId, { step: "description", title: text });
      await ctx.reply("📝 أرسل وصف المهمة:");
      return;
    }
    if (addTask.step === "description") {
      addTaskState.set(userId, { ...addTask, step: "type", description: text });
      await ctx.reply("📂 اختر نوع المهمة:", Markup.inlineKeyboard([
        [Markup.button.callback("📺 مشاهدة إعلان", "tasktype_watch_ad"), Markup.button.callback("📢 متابعة قناة", "tasktype_follow_channel")],
        [Markup.button.callback("🔗 زيارة رابط", "tasktype_visit_link"), Markup.button.callback("✅ أخرى", "tasktype_other")],
      ]));
      return;
    }
    if (addTask.step === "url") {
      const url = text === "-" ? undefined : text;
      addTaskState.set(userId, { ...addTask, step: "usdt_value", url });
      await ctx.reply(
        `💵 *أدخل قيمة المهمة بالدولار (USDT)*\n\n` +
        `مثال: 0.01 أو 0.05 أو 0.1\n\n` +
        `سيُحسب تلقائياً:\n• *70%* نقاط للمستخدم\n• *30%* ربح لك`,
        { parse_mode: "Markdown" },
      );
      return;
    }
    if (addTask.step === "usdt_value") {
      const usdtVal = parseFloat(text);
      if (isNaN(usdtVal) || usdtVal <= 0) {
        await ctx.reply("❌ أدخل رقماً صحيحاً مثل: 0.01");
        return;
      }
      const userPts = calcUserPoints(usdtVal);
      const adminPts = calcAdminPoints(usdtVal);
      await db.insert(tasksTable).values({
        title: addTask.title!,
        description: addTask.description!,
        type: addTask.type!,
        url: addTask.url ?? null,
        usdtValue: usdtVal.toFixed(4),
        rewardPoints: userPts,
        adminPoints: adminPts,
        active: true,
      });
      addTaskState.delete(userId);
      await ctx.reply(
        `✅ *تمت إضافة المهمة بنجاح!*\n\n` +
        `📌 العنوان: ${addTask.title}\n` +
        `💵 القيمة الكاملة: ${usdtVal.toFixed(4)}$ USDT\n` +
        `👤 المستخدم يكسب: *${userPts}* نقطة (${formatUsdt(pointsToUsdt(userPts))}$)\n` +
        `🏦 ربحك: *${adminPts}* نقطة (${formatUsdt(pointsToUsdt(adminPts))}$)`,
        { parse_mode: "Markdown" },
      );
      return;
    }
  }

  // سحب — استلام عنوان المحفظة
  const withdrawData = withdrawState.get(userId);
  if (withdrawData && typeof withdrawData === "object" && "method" in withdrawData) {
    withdrawState.delete(userId);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, userId)).limit(1);
    if (!user) { await ctx.reply("❌ يرجى كتابة /start أولاً."); return; }
    if (user.points < MIN_WITHDRAWAL_POINTS) { await ctx.reply("❌ رصيدك غير كافٍ."); return; }

    await db.insert(withdrawalsTable).values({
      userId: user.id, points: user.points,
      method: withdrawData.method, address: text, status: "pending",
    });
    await db.update(usersTable).set({ points: 0 }).where(eq(usersTable.id, user.id));

    if (ADMIN_ID) {
      try {
        await bot.telegram.sendMessage(ADMIN_ID,
          `🔔 *طلب سحب جديد!*\n` +
          `👤 ${user.firstName ?? user.username}\n` +
          `🪙 ${user.points.toLocaleString()} نقطة\n` +
          `💵 ${formatUsdt(pointsToUsdt(user.points))}$ USDT\n` +
          `💳 ${withdrawData.method}\n` +
          `📬 \`${text}\``,
          { parse_mode: "Markdown" });
      } catch (_) {}
    }
    await ctx.reply(`✅ *تم إرسال طلب السحب*\n\n💵 ${formatUsdt(pointsToUsdt(user.points))}$ USDT\nسيتم مراجعته خلال 24-48 ساعة. 🙏`, { parse_mode: "Markdown" });
  }
});

bot.action(/^tasktype_(.+)$/, async (ctx) => {
  const type = ctx.match[1];
  const userId = ctx.from.id;
  if (!isAdmin(userId)) { await ctx.answerCbQuery(); return; }
  const existing = addTaskState.get(userId);
  if (existing) addTaskState.set(userId, { ...existing, type, step: "url" });
  await ctx.editMessageText("🔗 أرسل رابط المهمة (أو أرسل - إذا لا يوجد رابط):");
  await ctx.answerCbQuery();
});

bot.catch((err, ctx) => {
  logger.error({ err, update: ctx.update }, "Telegram bot error");
});

export async function startBot(): Promise<void> {
  await initSettings();
  await seedTrustedTasks();

  // تسجيل قائمة الأوامر في تيليغرام
  try {
    await bot.telegram.setMyCommands([
      { command: "start",  description: "🏠 ابدأ / القائمة الرئيسية" },
      { command: "help",   description: "📖 دليل استخدام البوت" },
    ]);

    await bot.telegram.setMyDescription(
      "🤖 بوت الكسب الأوتوماتيكي\n\n" +
      "💰 اكسب نقاطاً من الإعلانات والمهام وتحويلها إلى USDT\n" +
      "⚡ النقاط تُضاف تلقائياً فور إنجاز أي عرض\n" +
      "🎁 30 نقطة مجاناً لكل صديق تدعوه\n\n" +
      "اضغط /start للبدء!"
    );

    await bot.telegram.setMyShortDescription("💰 اكسب USDT من الإعلانات والمهام — تلقائي 100%");
    logger.info("Bot commands and description set");
  } catch (err) {
    logger.warn({ err }, "Could not set bot commands/description");
  }

  bot.launch({ dropPendingUpdates: true });
  logger.info("Telegram bot started (polling)");
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
