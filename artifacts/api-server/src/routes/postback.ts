import { Router } from "express";
import crypto from "crypto";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { bot } from "../bot/index.js";
import { calcUserPoints, formatUsdt, pointsToUsdt } from "../bot/helpers.js";

const router = Router();

// ===== مساعد: منح النقاط للمستخدم =====
async function creditUser(opts: {
  userCode: string;
  network: string;
  offerId?: string;
  offerName?: string;
  usdtAmount: number;
  transactionId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  // إيجاد المستخدم عبر referralCode
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referralCode, opts.userCode))
    .limit(1);

  if (!user) return { ok: false, reason: "user_not_found" };

  // منع التكرار
  if (opts.transactionId) {
    const [dup] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.transactionId, opts.transactionId))
      .limit(1);
    if (dup) return { ok: false, reason: "duplicate" };
  }

  const points = calcUserPoints(opts.usdtAmount);

  // تسجيل المعاملة
  await db.insert(transactionsTable).values({
    userId: user.id,
    network: opts.network,
    offerId: opts.offerId ?? null,
    offerName: opts.offerName ?? null,
    usdtAmount: opts.usdtAmount.toFixed(4),
    pointsAwarded: points,
    transactionId: opts.transactionId ?? null,
  });

  // إضافة النقاط
  await db
    .update(usersTable)
    .set({ points: user.points + points })
    .where(eq(usersTable.id, user.id));

  // إشعار تيليغرام فوري
  try {
    await bot.telegram.sendMessage(
      user.telegramId,
      `🎉 *تم إضافة نقاط تلقائياً!*\n\n` +
        `🌐 المصدر: *${opts.network}*\n` +
        (opts.offerName ? `📌 المهمة: ${opts.offerName}\n` : "") +
        `💵 القيمة: *${formatUsdt(opts.usdtAmount)}$ USDT*\n` +
        `🪙 نقاطك الجديدة: *+${points}* نقطة\n\n` +
        `رصيدك الكلي: *${user.points + points}* نقطة`,
      { parse_mode: "Markdown" },
    );
  } catch (_) {}

  return { ok: true };
}

// ===================================================
// AdGate Media
// Postback: GET /api/postback/adgate
// Params: uid, reward, offer_id, offer_name, transaction_id, hash
// ===================================================
router.get("/postback/adgate", async (req, res) => {
  const { uid, reward, offer_id, offer_name, transaction_id, hash } = req.query as Record<string, string>;
  const secret = process.env["ADGATE_SECRET"] ?? "";

  // التحقق من الهاش
  if (secret) {
    const expected = crypto
      .createHash("md5")
      .update(`${uid}${reward}${secret}`)
      .digest("hex");
    if (hash !== expected) {
      res.status(403).send("invalid_hash");
      return;
    }
  }

  const result = await creditUser({
    userCode: uid,
    network: "AdGate",
    offerId: offer_id,
    offerName: offer_name,
    usdtAmount: parseFloat(reward) || 0,
    transactionId: transaction_id,
  });

  res.send(result.ok ? "1" : result.reason ?? "error");
});

// ===================================================
// Offertoro
// Postback: GET /api/postback/offertoro
// Params: user_id, payout, oid, oname, oid_unique, security_token
// ===================================================
router.get("/postback/offertoro", async (req, res) => {
  const { user_id, payout, oid, oname, oid_unique, security_token } = req.query as Record<string, string>;
  const secret = process.env["OFFERTORO_SECRET"] ?? "";

  if (secret && security_token !== secret) {
    res.status(403).send("invalid_token");
    return;
  }

  const result = await creditUser({
    userCode: user_id,
    network: "Offertoro",
    offerId: oid,
    offerName: oname,
    usdtAmount: parseFloat(payout) || 0,
    transactionId: oid_unique,
  });

  res.send(result.ok ? "1" : result.reason ?? "error");
});

// ===================================================
// Lootably
// Postback: GET /api/postback/lootably
// Params: userId, amount, placementId, txId, token
// ===================================================
router.get("/postback/lootably", async (req, res) => {
  const { userId, amount, txId, token } = req.query as Record<string, string>;
  const secret = process.env["LOOTABLY_SECRET"] ?? "";

  if (secret) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${userId}${amount}${txId}`)
      .digest("hex");
    if (token !== expected) {
      res.status(403).send("invalid_token");
      return;
    }
  }

  const result = await creditUser({
    userCode: userId,
    network: "Lootably",
    usdtAmount: parseFloat(amount) || 0,
    transactionId: txId,
  });

  res.send(result.ok ? "1" : result.reason ?? "error");
});

// ===================================================
// CPAlead
// Postback: GET /api/postback/cpalead
// Params: user_id, payout, offer_id, subid, api_key
// ===================================================
router.get("/postback/cpalead", async (req, res) => {
  const { user_id, payout, offer_id, subid, api_key } = req.query as Record<string, string>;
  const secret = process.env["CPALEAD_API_KEY"] ?? "";

  if (secret && api_key !== secret) {
    res.status(403).send("invalid_key");
    return;
  }

  const result = await creditUser({
    userCode: user_id,
    network: "CPAlead",
    offerId: offer_id,
    usdtAmount: parseFloat(payout) || 0,
    transactionId: subid,
  });

  res.send(result.ok ? "1" : result.reason ?? "error");
});

// ===================================================
// Ayet Studios
// Postback: GET /api/postback/ayet
// Params: uid, amount, txid, hash
// ===================================================
router.get("/postback/ayet", async (req, res) => {
  const { uid, amount, txid, hash } = req.query as Record<string, string>;
  const secret = process.env["AYET_SECRET"] ?? "";

  if (secret) {
    const expected = crypto
      .createHash("sha256")
      .update(`${uid}:${amount}:${txid}:${secret}`)
      .digest("hex");
    if (hash !== expected) {
      res.status(403).send("invalid_hash");
      return;
    }
  }

  const result = await creditUser({
    userCode: uid,
    network: "Ayet Studios",
    usdtAmount: parseFloat(amount) || 0,
    transactionId: txid,
  });

  res.send(result.ok ? "1" : result.reason ?? "error");
});

export default router;
