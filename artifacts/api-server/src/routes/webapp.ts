import { Router } from "express";
import { db, usersTable, withdrawalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateReferralCode, POINTS_PER_REFERRAL, MIN_WITHDRAWAL_POINTS, pointsToUsdt, formatUsdt } from "../bot/helpers.js";
import { logger } from "../lib/logger.js";
import { bot } from "../bot/index.js";

const router = Router();

// التحقق من المستخدم وإعادة بياناته (أو إنشاؤه)
router.post("/webapp/auth", async (req, res) => {
  try {
    const { telegramId, firstName, lastName, username, referralCode: refCode } = req.body as {
      telegramId: number;
      firstName?: string;
      lastName?: string;
      username?: string;
      referralCode?: string;
    };

    if (!telegramId || typeof telegramId !== "number") {
      res.status(400).json({ error: "telegramId required" });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    if (existing) {
      res.json({
        points: existing.points,
        referralCode: existing.referralCode,
        usdt: formatUsdt(pointsToUsdt(existing.points)),
        minWithdrawal: MIN_WITHDRAWAL_POINTS,
      });
      return;
    }

    let referredById: number | undefined;
    if (refCode) {
      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, refCode)).limit(1);
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

    res.json({
      points: newUser.points,
      referralCode: newUser.referralCode,
      usdt: formatUsdt(pointsToUsdt(newUser.points)),
      minWithdrawal: MIN_WITHDRAWAL_POINTS,
      isNew: true,
    });
  } catch (err) {
    logger.error({ err }, "webapp auth error");
    res.status(500).json({ error: "server error" });
  }
});

// طلب سحب من Mini App
router.post("/webapp/withdraw", async (req, res) => {
  try {
    const { telegramId, method, address } = req.body as {
      telegramId: number;
      method: string;
      address: string;
    };

    if (!telegramId || !method || !address?.trim()) {
      res.status(400).json({ error: "بيانات ناقصة" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

    if (user.points < MIN_WITHDRAWAL_POINTS) {
      res.status(400).json({
        error: `رصيدك غير كافٍ. الحد الأدنى ${MIN_WITHDRAWAL_POINTS} نقطة`,
      });
      return;
    }

    const usdtVal = formatUsdt(pointsToUsdt(user.points));

    // إنشاء طلب السحب وإفراغ الرصيد
    await db.insert(withdrawalsTable).values({
      userId: user.id,
      points: user.points,
      method,
      address: address.trim(),
      status: "pending",
    });
    await db.update(usersTable).set({ points: 0 }).where(eq(usersTable.id, user.id));

    // إشعار الأدمين
    const adminId = process.env["ADMIN_TELEGRAM_ID"] ? Number(process.env["ADMIN_TELEGRAM_ID"]) : null;
    if (adminId) {
      try {
        await bot.telegram.sendMessage(
          adminId,
          `🔔 *طلب سحب جديد من Mini App!*\n` +
          `👤 ${user.firstName ?? user.username ?? "مجهول"}\n` +
          `🪙 ${user.points.toLocaleString()} نقطة\n` +
          `💵 ${usdtVal}$ USDT\n` +
          `💳 ${method}\n` +
          `📬 \`${address.trim()}\``,
          { parse_mode: "Markdown" }
        );
      } catch (_) {}
    }

    // إشعار المستخدم في البوت
    try {
      await bot.telegram.sendMessage(
        telegramId,
        `✅ *تم إرسال طلب سحبك*\n\n` +
        `💵 ${usdtVal}$ USDT\n` +
        `💳 ${method}\n` +
        `📬 \`${address.trim()}\`\n\n` +
        `سيتم التحويل خلال 24-48 ساعة 🙏`,
        { parse_mode: "Markdown" }
      );
    } catch (_) {}

    res.json({ ok: true, usdt: usdtVal });
  } catch (err) {
    logger.error({ err }, "webapp withdraw error");
    res.status(500).json({ error: "حدث خطأ، حاول مجدداً" });
  }
});

export default router;
