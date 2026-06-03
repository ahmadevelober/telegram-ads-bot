import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pointsToUsdt, formatUsdt } from "../bot/helpers.js";

const router = Router();

// صفحة الإعلانات — المستخدم يصل إليها من البوت
router.get("/earn/:userCode", async (req, res) => {
  const { userCode } = req.params;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referralCode, userCode))
    .limit(1);

  if (!user) {
    res.status(404).send("<h2>رابط غير صالح. ارجع للبوت واضغط 📺 شاهد إعلانات</h2>");
    return;
  }

  const ADGATE_ID = process.env["ADGATE_PLACEMENT_ID"] ?? "";
  const OFFERTORO_SITE = process.env["OFFERTORO_SITE_ID"] ?? "";
  const OFFERTORO_PLACEMENT = process.env["OFFERTORO_PLACEMENT_ID"] ?? "";
  const LOOTABLY_ID = process.env["LOOTABLY_PLACEMENT_ID"] ?? "";

  const userName = user.firstName ?? user.username ?? "صديق";
  const userPoints = user.points;
  const userUsdt = formatUsdt(pointsToUsdt(userPoints));

  // بناء HTML الصفحة
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>اربح نقاط</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #0f0f1a;
      color: #fff;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 20px;
      text-align: center;
      border-bottom: 2px solid #4a4a8a;
    }
    .header h1 { font-size: 1.5rem; color: #a78bfa; margin-bottom: 8px; }
    .balance-card {
      display: inline-flex; gap: 30px;
      background: rgba(167,139,250,0.1);
      border: 1px solid rgba(167,139,250,0.3);
      border-radius: 12px; padding: 12px 24px; margin-top: 10px;
    }
    .balance-item { text-align: center; }
    .balance-item .val { font-size: 1.4rem; font-weight: bold; color: #fbbf24; }
    .balance-item .lbl { font-size: 0.75rem; color: #9ca3af; }
    .notice {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 10px; margin: 16px; padding: 14px;
      font-size: 0.9rem; color: #6ee7b7; text-align: center;
      line-height: 1.7;
    }
    .tabs {
      display: flex; overflow-x: auto;
      background: #1a1a2e;
      border-bottom: 2px solid #2d2d5e;
    }
    .tab {
      flex: 1; min-width: 100px;
      padding: 14px 8px;
      text-align: center; cursor: pointer;
      border: none; background: transparent;
      color: #9ca3af; font-size: 0.85rem;
      transition: all 0.2s;
    }
    .tab.active { color: #a78bfa; border-bottom: 3px solid #a78bfa; }
    .wall-container { display: none; padding: 10px; }
    .wall-container.active { display: block; }
    .wall-container iframe {
      width: 100%; min-height: 600px;
      border: none; border-radius: 12px;
      background: #fff;
    }
    .setup-msg {
      text-align: center; padding: 40px 20px;
      color: #6b7280; font-size: 1rem; line-height: 1.8;
    }
    .setup-msg a { color: #a78bfa; }
  </style>
</head>
<body>

<div class="header">
  <h1>🎯 أهلاً ${userName}!</h1>
  <div class="balance-card">
    <div class="balance-item">
      <div class="val">${userPoints.toLocaleString()}</div>
      <div class="lbl">🪙 نقطة</div>
    </div>
    <div class="balance-item">
      <div class="val">${userUsdt}$</div>
      <div class="lbl">💵 USDT</div>
    </div>
  </div>
</div>

<div class="notice">
  ✅ أنجز أي عرض أو شاهد أي إعلان<br/>
  وستُضاف النقاط <strong>تلقائياً</strong> لحسابك في البوت فوراً 🚀
</div>

<div class="tabs">
  ${ADGATE_ID ? `<button class="tab active" onclick="showTab('adgate', this)">🏆 AdGate</button>` : ""}
  ${OFFERTORO_SITE ? `<button class="tab ${!ADGATE_ID ? "active" : ""}" onclick="showTab('offertoro', this)">💎 Offertoro</button>` : ""}
  ${LOOTABLY_ID ? `<button class="tab" onclick="showTab('lootably', this)">🎮 Lootably</button>` : ""}
  ${!ADGATE_ID && !OFFERTORO_SITE && !LOOTABLY_ID ? `<button class="tab active">⚙️ الإعداد</button>` : ""}
</div>

${ADGATE_ID ? `
<div id="wall-adgate" class="wall-container active">
  <iframe src="https://wall.adgaterewards.com/${ADGATE_ID}?uid=${userCode}" loading="lazy"></iframe>
</div>` : ""}

${OFFERTORO_SITE ? `
<div id="wall-offertoro" class="wall-container ${!ADGATE_ID ? "active" : ""}">
  <iframe src="https://www.offertoro.com/ifr/show/${OFFERTORO_PLACEMENT}/${OFFERTORO_SITE}/${userCode}/" loading="lazy"></iframe>
</div>` : ""}

${LOOTABLY_ID ? `
<div id="wall-lootably" class="wall-container">
  <iframe src="https://wall.lootably.com/?placementID=${LOOTABLY_ID}&uid=${userCode}" loading="lazy"></iframe>
</div>` : ""}

${!ADGATE_ID && !OFFERTORO_SITE && !LOOTABLY_ID ? `
<div id="wall-setup" class="wall-container active">
  <div class="setup-msg">
    ⚙️ <strong>لتفعيل الإعلانات التلقائية</strong><br/><br/>
    يحتاج المدير إضافة معرّفات الشبكات في Secrets<br/>
    <code>ADGATE_PLACEMENT_ID</code><br/>
    <code>OFFERTORO_SITE_ID</code><br/>
    <code>LOOTABLY_PLACEMENT_ID</code>
  </div>
</div>` : ""}

<script>
function showTab(name, btn) {
  document.querySelectorAll('.wall-container').forEach(w => w.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('wall-' + name).classList.add('active');
  btn.classList.add('active');
}
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
