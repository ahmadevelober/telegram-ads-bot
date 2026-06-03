import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pointsToUsdt, formatUsdt } from "../bot/helpers.js";

const router = Router();

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

  const CPALEAD_ID       = process.env["CPALEAD_PLACEMENT_ID"] ?? "";
  const TOROX_SITE       = process.env["TOROX_SITE_ID"] ?? "";
  const TOROX_PLACEMENT  = process.env["TOROX_PLACEMENT_ID"] ?? "";
  const ADGATE_ID        = process.env["ADGATE_PLACEMENT_ID"] ?? "";
  const OFFERTORO_SITE   = process.env["OFFERTORO_SITE_ID"] ?? "";
  const OFFERTORO_PLACE  = process.env["OFFERTORO_PLACEMENT_ID"] ?? "";
  const LOOTABLY_ID      = process.env["LOOTABLY_PLACEMENT_ID"] ?? "";
  const hasAny = !!(CPALEAD_ID || TOROX_SITE || ADGATE_ID || OFFERTORO_SITE || LOOTABLY_ID);

  const userName  = user.firstName ?? user.username ?? "صديق";
  const userPoints = user.points;
  const userUsdt  = formatUsdt(pointsToUsdt(userPoints));

  // بناء التابات ديناميكياً — CPAlead أول لأنه فوري
  type Tab = { id: string; label: string };
  const tabs: Tab[] = [];
  if (CPALEAD_ID)     tabs.push({ id: "cpalead",   label: "⚡ CPAlead" });
  if (TOROX_SITE)     tabs.push({ id: "torox",     label: "🔥 Torox" });
  if (ADGATE_ID)      tabs.push({ id: "adgate",    label: "🏆 AdGate" });
  if (OFFERTORO_SITE) tabs.push({ id: "offertoro", label: "💎 Offertoro" });
  if (LOOTABLY_ID)    tabs.push({ id: "lootably",  label: "🎮 Lootably" });

  const tabsHtml = hasAny
    ? `<div class="tabs">${tabs.map((t, i) =>
        `<button class="tab${i === 0 ? " active" : ""}" onclick="showTab('${t.id}',this)">${t.label}</button>`
      ).join("")}</div>`
    : `<div class="tabs"><button class="tab active">⚙️ الإعداد</button></div>`;

  const wallsHtml = hasAny
    ? [
        CPALEAD_ID     ? `<div id="wall-cpalead"   class="wall-container${tabs[0]?.id === "cpalead"   ? " active" : ""}"><iframe src="https://wall.cpalead.com/c/?id=${CPALEAD_ID}&sub1=${userCode}" loading="lazy"></iframe></div>` : "",
        TOROX_SITE     ? `<div id="wall-torox"     class="wall-container${tabs[0]?.id === "torox"     ? " active" : ""}"><iframe src="https://www.torox.io/ifr/show/${TOROX_PLACEMENT}/${TOROX_SITE}/${userCode}" loading="lazy"></iframe></div>` : "",
        ADGATE_ID      ? `<div id="wall-adgate"    class="wall-container${tabs[0]?.id === "adgate"    ? " active" : ""}"><iframe src="https://wall.adgaterewards.com/${ADGATE_ID}?uid=${userCode}" loading="lazy"></iframe></div>` : "",
        OFFERTORO_SITE ? `<div id="wall-offertoro" class="wall-container${tabs[0]?.id === "offertoro" ? " active" : ""}"><iframe src="https://www.offertoro.com/ifr/show/${OFFERTORO_PLACE}/${OFFERTORO_SITE}/${userCode}/" loading="lazy"></iframe></div>` : "",
        LOOTABLY_ID    ? `<div id="wall-lootably"  class="wall-container${tabs[0]?.id === "lootably"  ? " active" : ""}"><iframe src="https://wall.lootably.com/?placementID=${LOOTABLY_ID}&uid=${userCode}" loading="lazy"></iframe></div>` : "",
      ].join("\n")
    : `<div class="wall-container active"><div class="setup-msg">
        ⚙️ <strong>لتفعيل الإعلانات التلقائية</strong><br/><br/>
        أضف أي من هذه في Secrets:<br/><br/>
        <code>CPALEAD_PLACEMENT_ID</code> — فوري ✅<br/>
        <code>TOROX_SITE_ID</code> + <code>TOROX_PLACEMENT_ID</code><br/>
        <code>ADGATE_PLACEMENT_ID</code><br/>
        <code>OFFERTORO_SITE_ID</code> + <code>OFFERTORO_PLACEMENT_ID</code><br/>
        <code>LOOTABLY_PLACEMENT_ID</code>
      </div></div>`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>اربح نقاط</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0f0f1a; color: #fff; min-height: 100vh; }
    .header { background: linear-gradient(135deg,#1a1a2e,#16213e); padding: 20px; text-align: center; border-bottom: 2px solid #4a4a8a; }
    .header h1 { font-size: 1.5rem; color: #a78bfa; margin-bottom: 8px; }
    .balance-card { display: inline-flex; gap: 30px; background: rgba(167,139,250,.1); border: 1px solid rgba(167,139,250,.3); border-radius: 12px; padding: 12px 24px; margin-top: 10px; }
    .balance-item { text-align: center; }
    .balance-item .val { font-size: 1.4rem; font-weight: bold; color: #fbbf24; }
    .balance-item .lbl { font-size: .75rem; color: #9ca3af; }
    .notice { background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.4); border-radius: 10px; margin: 16px; padding: 14px; font-size: .9rem; color: #6ee7b7; text-align: center; line-height: 1.7; }
    .tabs { display: flex; overflow-x: auto; background: #1a1a2e; border-bottom: 2px solid #2d2d5e; }
    .tab { flex: 1; min-width: 90px; padding: 14px 8px; text-align: center; cursor: pointer; border: none; background: transparent; color: #9ca3af; font-size: .85rem; transition: all .2s; }
    .tab.active { color: #a78bfa; border-bottom: 3px solid #a78bfa; }
    .wall-container { display: none; padding: 10px; }
    .wall-container.active { display: block; }
    .wall-container iframe { width: 100%; min-height: 600px; border: none; border-radius: 12px; background: #fff; }
    .setup-msg { text-align: center; padding: 40px 20px; color: #6b7280; font-size: 1rem; line-height: 2; }
    .setup-msg code { background: #1e1e3a; padding: 2px 8px; border-radius: 4px; color: #a78bfa; font-size: .85rem; }
  </style>
</head>
<body>
<div class="header">
  <h1>🎯 أهلاً ${userName}!</h1>
  <div class="balance-card">
    <div class="balance-item"><div class="val">${userPoints.toLocaleString()}</div><div class="lbl">🪙 نقطة</div></div>
    <div class="balance-item"><div class="val">${userUsdt}$</div><div class="lbl">💵 USDT</div></div>
  </div>
</div>
<div class="notice">
  ✅ أنجز أي عرض أو شاهد أي إعلان<br/>
  وستُضاف النقاط <strong>تلقائياً</strong> لحسابك في البوت فوراً 🚀<br/>
  💡 10 نقاط = 1 سنت | 1000 نقطة = 1$ USDT
</div>
${tabsHtml}
${wallsHtml}
<script>
function showTab(name,btn){
  document.querySelectorAll('.wall-container').forEach(w=>w.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('wall-'+name).classList.add('active');
  btn.classList.add('active');
}
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
