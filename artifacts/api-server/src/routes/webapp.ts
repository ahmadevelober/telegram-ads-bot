import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateReferralCode, POINTS_PER_REFERRAL, pointsToUsdt, formatUsdt } from "../bot/helpers.js";
import { logger } from "../lib/logger.js";

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

    // جلب المستخدم الموجود
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    if (existing) {
      res.json({
        points: existing.points,
        referralCode: existing.referralCode,
        usdt: formatUsdt(pointsToUsdt(existing.points)),
      });
      return;
    }

    // إنشاء مستخدم جديد
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
      isNew: true,
    });
  } catch (err) {
    logger.error({ err }, "webapp auth error");
    res.status(500).json({ error: "server error" });
  }
});

export default router;
