import { Telegraf, Markup, session } from "telegraf";
import { db, usersTable, tasksTable, taskCompletionsTable, withdrawalsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { generateReferralCode, MIN_WITHDRAWAL_POINTS, POINTS_PER_REFERRAL } from "./helpers.js";
import { mainKeyboard, adminKeyboard } from "./keyboards.js";
import {
  welcomeMessage,
  balanceMessage,
  noTasksMessage,
  taskMessage,
  referralMessage,
} from "./messages.js";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ADMIN_ID = process.env["ADMIN_TELEGRAM_ID"]
  ? Number(process.env["ADMIN_TELEGRAM_ID"])
  : null;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

export const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

async function getOrCreateUser(
  telegramId: number,
  firstName?: string,
  lastName?: string,
  username?: string,
  referralCode?: string,
) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (existing) return { user: existing, isNew: false };

  let referredById: number | undefined;
  if (referralCode) {
    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode))
      .limit(1);

    if (referrer && referrer.telegramId !== telegramId) {
      referredById = referrer.id;
      await db
        .update(usersTable)
        .set({ points: referrer.points + POINTS_PER_REFERRAL })
        .where(eq(usersTable.id, referrer.id));
    }
  }

  const code = generateReferralCode();
  const [newUser] = await db
    .insert(usersTable)
    .values({
      telegramId,
      firstName,
      lastName,
      username,
      referralCode: code,
      referredBy: referredById ?? null,
    })
    .returning();

  return { user: newUser, isNew: true };
}

function isAdmin(telegramId: number): boolean {
  return ADMIN_ID !== null && telegramId === ADMIN_ID;
}

bot.start(async (ctx) => {
  const tgUser = ctx.from;
  const payload = ctx.startPayload;

  try {
    const { user, isNew } = await getOrCreateUser(
      tgUser.id,
      tgUser.first_name,
      tgUser.last_name,
      tgUser.username,
      payload || undefined,
    );

    const keyboard = isAdmin(tgUser.id) ? adminKeyboard : mainKeyboard;
    await ctx.reply(welcomeMessage(user, isNew), {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch (err) {
    logger.error({ err }, "Error in /start");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

bot.hears("💰 رصيدي", async (ctx) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);

    if (!user) {
      await ctx.reply("❌ يرجى كتابة /start أولاً.");
      return;
    }

    const [{ count: referralCount }] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.referredBy, user.id));

    await ctx.reply(balanceMessage(user.points, referralCount), {
      parse_mode: "Markdown",
    });
  } catch (err) {
    logger.error({ err }, "Error in balance");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

bot.hears("📋 المهام", async (ctx) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);

    if (!user) {
      await ctx.reply("❌ يرجى كتابة /start أولاً.");
      return;
    }

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.active, true));

    if (tasks.length === 0) {
      await ctx.reply(noTasksMessage());
      return;
    }

    const completions = await db
      .select()
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.userId, user.id));

    const completedIds = new Set(completions.map((c) => c.taskId));

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const done = completedIds.has(task.id);
      const text = taskMessage(task, i + 1, tasks.length, done);

      if (!done) {
        const rows = [];
        if (task.url) {
          rows.push([Markup.button.url("🔗 افتح المهمة", task.url)]);
        }
        rows.push([Markup.button.callback("✅ أنجزت المهمة", `complete_${task.id}`)]);
        await ctx.reply(text, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard(rows),
        });
      } else {
        await ctx.reply(text, { parse_mode: "Markdown" });
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in tasks");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

bot.action(/^complete_(\d+)$/, async (ctx) => {
  try {
    const taskId = Number(ctx.match[1]);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);

    if (!user) {
      await ctx.answerCbQuery("❌ يرجى كتابة /start أولاً.");
      return;
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.active, true)))
      .limit(1);

    if (!task) {
      await ctx.answerCbQuery("❌ المهمة غير موجودة.");
      return;
    }

    const [existing] = await db
      .select()
      .from(taskCompletionsTable)
      .where(
        and(
          eq(taskCompletionsTable.userId, user.id),
          eq(taskCompletionsTable.taskId, taskId),
        ),
      )
      .limit(1);

    if (existing) {
      await ctx.answerCbQuery("⚠️ أنجزت هذه المهمة مسبقاً.");
      return;
    }

    await db.insert(taskCompletionsTable).values({ userId: user.id, taskId });
    await db
      .update(usersTable)
      .set({ points: user.points + task.rewardPoints })
      .where(eq(usersTable.id, user.id));

    await ctx.answerCbQuery(`🎉 أحسنت! ربحت ${task.rewardPoints} نقطة`);
    await ctx.editMessageText(
      `✅ *${task.title}* — مكتملة\n🏆 ربحت *${task.rewardPoints}* نقطة!`,
      { parse_mode: "Markdown" },
    );
  } catch (err) {
    logger.error({ err }, "Error completing task");
    await ctx.answerCbQuery("❌ حدث خطأ، حاول مجدداً.");
  }
});

bot.hears("👥 الإحالة", async (ctx) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);

    if (!user) {
      await ctx.reply("❌ يرجى كتابة /start أولاً.");
      return;
    }

    const botInfo = await bot.telegram.getMe();
    const [{ count: referralCount }] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.referredBy, user.id));

    await ctx.reply(referralMessage(user.referralCode, botInfo.username ?? "", referralCount), {
      parse_mode: "Markdown",
    });
  } catch (err) {
    logger.error({ err }, "Error in referral");
    await ctx.reply("❌ حدث خطأ، حاول مجدداً.");
  }
});

bot.hears("📊 إحصائياتي", async (ctx) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);

    if (!user) {
      await ctx.reply("❌ يرجى كتابة /start أولاً.");
      return;
    }

    const [{ count: completedCount }] = await db
      .select({ count: count() })
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.userId, user.id));

    const [{ count: referralCount }] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.referredBy, user.id));

    const [{ count: withdrawalCount }] = await db
      .select({ count: count() })
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, user.id));

    const name = user.firstName ?? user.username ?? "أنت";
    await ctx.reply(
      `📊 *إحصائيات ${name}*\n\n` +
        `🪙 الرصيد: *${user.points.toLocaleString()}* نقطة\n` +
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

const withdrawState = new Map<number, { method: string } | "awaiting_method">();

bot.hears("💸 سحب", async (ctx) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);

    if (!user) {
      await ctx.reply("❌ يرجى كتابة /start أولاً.");
      return;
    }

    if (user.points < MIN_WITHDRAWAL_POINTS) {
      await ctx.reply(
        `❌ رصيدك غير كافٍ.\n\n` +
          `رصيدك: *${user.points.toLocaleString()}* نقطة\n` +
          `الحد الأدنى للسحب: *${MIN_WITHDRAWAL_POINTS.toLocaleString()}* نقطة`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    withdrawState.set(ctx.from.id, "awaiting_method");
    await ctx.reply(
      `💸 *طلب سحب*\n\nرصيدك: *${user.points.toLocaleString()}* نقطة\n\nاختر طريقة السحب:`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("💎 USDT", "withdraw_usdt"),
            Markup.button.callback("💳 PayPal", "withdraw_paypal"),
          ],
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
  await ctx.editMessageText(
    `✅ اخترت: *${methodName}*\n\nأرسل عنوان المحفظة أو البريد الإلكتروني:`,
    { parse_mode: "Markdown" },
  );
  await ctx.answerCbQuery();
});

bot.hears("🔧 لوحة الإدارة", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const [{ count: userCount }] = await db.select({ count: count() }).from(usersTable);
  const [{ count: taskCount }] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.active, true));
  const [{ count: pendingWithdrawals }] = await db
    .select({ count: count() })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.status, "pending"));

  await ctx.reply(
    `🔧 *لوحة الإدارة*\n\n` +
      `👥 المستخدمون: *${userCount}*\n` +
      `📋 المهام النشطة: *${taskCount}*\n` +
      `⏳ طلبات السحب المعلقة: *${pendingWithdrawals}*\n\n` +
      `الأوامر المتاحة:\n` +
      `/addtask — إضافة مهمة جديدة\n` +
      `/pendingwithdrawals — عرض طلبات السحب\n` +
      `/broadcast — إرسال رسالة للجميع`,
    { parse_mode: "Markdown" },
  );
});

type AddTaskStep = "title" | "description" | "type" | "url" | "reward";
type AddTaskState = {
  step: AddTaskStep;
  title?: string;
  description?: string;
  type?: string;
  url?: string;
};

const addTaskState = new Map<number, AddTaskState>();

bot.command("addtask", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  addTaskState.set(ctx.from.id, { step: "title" });
  await ctx.reply("➕ *إضافة مهمة جديدة*\n\nأرسل عنوان المهمة:", {
    parse_mode: "Markdown",
  });
});

bot.command("pendingwithdrawals", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const pending = await db
    .select({ w: withdrawalsTable, u: usersTable })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.status, "pending"))
    .limit(10);

  if (pending.length === 0) {
    await ctx.reply("✅ لا توجد طلبات سحب معلقة.");
    return;
  }

  for (const { w, u } of pending) {
    const userName = u?.firstName ?? u?.username ?? `ID:${u?.telegramId}`;
    await ctx.reply(
      `💸 *طلب سحب #${w.id}*\n` +
        `👤 المستخدم: ${userName}\n` +
        `🪙 النقاط: *${w.points.toLocaleString()}*\n` +
        `💳 الطريقة: ${w.method}\n` +
        `📬 العنوان: \`${w.address}\``,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ قبول", `approve_${w.id}`),
            Markup.button.callback("❌ رفض", `reject_${w.id}`),
          ],
        ]),
      },
    );
  }
});

bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery("⛔ غير مصرح لك.");
    return;
  }

  const action = ctx.match[1];
  const withdrawalId = Number(ctx.match[2]);

  const [withdrawal] = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.id, withdrawalId))
    .limit(1);

  if (!withdrawal) {
    await ctx.answerCbQuery("❌ الطلب غير موجود.");
    return;
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  await db
    .update(withdrawalsTable)
    .set({ status: newStatus })
    .where(eq(withdrawalsTable.id, withdrawalId));

  if (action === "reject") {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, withdrawal.userId))
      .limit(1);
    if (user) {
      await db
        .update(usersTable)
        .set({ points: user.points + withdrawal.points })
        .where(eq(usersTable.id, user.id));
      try {
        await bot.telegram.sendMessage(
          user.telegramId,
          `❌ *تم رفض طلب سحبك*\n\nتم إعادة *${withdrawal.points.toLocaleString()}* نقطة إلى رصيدك.`,
          { parse_mode: "Markdown" },
        );
      } catch (_) {}
    }
  } else {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, withdrawal.userId))
      .limit(1);
    if (user) {
      try {
        await bot.telegram.sendMessage(
          user.telegramId,
          `✅ *تمت الموافقة على طلب سحبك*\n\nسيتم تحويل المبلغ قريباً. شكراً!`,
          { parse_mode: "Markdown" },
        );
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

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (text.startsWith("/")) return;

  if (broadcastStep.get(userId) && isAdmin(userId)) {
    broadcastStep.delete(userId);
    const users = await db
      .select({ telegramId: usersTable.telegramId })
      .from(usersTable);
    let sent = 0;
    for (const u of users) {
      try {
        await bot.telegram.sendMessage(u.telegramId, text, {
          parse_mode: "Markdown",
        });
        sent++;
      } catch (_) {}
    }
    await ctx.reply(`✅ تم إرسال الرسالة لـ ${sent} مستخدم.`);
    return;
  }

  const addTask = addTaskState.get(userId);
  if (addTask && isAdmin(userId)) {
    if (addTask.step === "title") {
      addTaskState.set(userId, { step: "description", title: text });
      await ctx.reply("📝 أرسل وصف المهمة:");
      return;
    }
    if (addTask.step === "description") {
      addTaskState.set(userId, { ...addTask, step: "type", description: text });
      await ctx.reply(
        "📂 اختر نوع المهمة:",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("📺 مشاهدة إعلان", "tasktype_watch_ad"),
            Markup.button.callback("📢 متابعة قناة", "tasktype_follow_channel"),
          ],
          [
            Markup.button.callback("🔗 زيارة رابط", "tasktype_visit_link"),
            Markup.button.callback("✅ أخرى", "tasktype_other"),
          ],
        ]),
      );
      return;
    }
    if (addTask.step === "url") {
      const url = text === "-" ? undefined : text;
      addTaskState.set(userId, { ...addTask, step: "reward", url });
      await ctx.reply("🏆 كم نقطة مكافأة للمهمة؟");
      return;
    }
    if (addTask.step === "reward") {
      const reward = Number(text);
      if (isNaN(reward) || reward <= 0) {
        await ctx.reply("❌ أدخل رقماً صحيحاً أكبر من 0.");
        return;
      }
      await db.insert(tasksTable).values({
        title: addTask.title!,
        description: addTask.description!,
        type: addTask.type!,
        url: addTask.url ?? null,
        rewardPoints: reward,
        active: true,
      });
      addTaskState.delete(userId);
      await ctx.reply(
        `✅ تمت إضافة المهمة: *${addTask.title}* (${reward} نقطة)`,
        { parse_mode: "Markdown" },
      );
      return;
    }
  }

  const withdrawData = withdrawState.get(userId);
  if (withdrawData && typeof withdrawData === "object" && "method" in withdrawData) {
    withdrawState.delete(userId);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, userId))
      .limit(1);

    if (!user) {
      await ctx.reply("❌ يرجى كتابة /start أولاً.");
      return;
    }
    if (user.points < MIN_WITHDRAWAL_POINTS) {
      await ctx.reply("❌ رصيدك غير كافٍ.");
      return;
    }

    await db.insert(withdrawalsTable).values({
      userId: user.id,
      points: user.points,
      method: withdrawData.method,
      address: text,
      status: "pending",
    });

    await db
      .update(usersTable)
      .set({ points: 0 })
      .where(eq(usersTable.id, user.id));

    if (ADMIN_ID) {
      try {
        await bot.telegram.sendMessage(
          ADMIN_ID,
          `🔔 *طلب سحب جديد!*\n👤 ${user.firstName ?? user.username}\n🪙 ${user.points.toLocaleString()} نقطة\n💳 ${withdrawData.method}\n📬 \`${text}\``,
          { parse_mode: "Markdown" },
        );
      } catch (_) {}
    }

    await ctx.reply(
      `✅ *تم إرسال طلب السحب*\n\nسيتم مراجعته خلال 24-48 ساعة.\nشكراً لك! 🙏`,
      { parse_mode: "Markdown" },
    );
  }
});

bot.action(/^tasktype_(.+)$/, async (ctx) => {
  const type = ctx.match[1];
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery();
    return;
  }

  const existing = addTaskState.get(userId);
  if (existing) {
    addTaskState.set(userId, { ...existing, type, step: "url" });
  }
  await ctx.editMessageText(
    "🔗 أرسل رابط المهمة (أو أرسل - إذا لا يوجد رابط):",
  );
  await ctx.answerCbQuery();
});

bot.catch((err, ctx) => {
  logger.error({ err, update: ctx.update }, "Telegram bot error");
});

export function startBot(): void {
  bot.launch({ dropPendingUpdates: true });
  logger.info("Telegram bot started (polling)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
