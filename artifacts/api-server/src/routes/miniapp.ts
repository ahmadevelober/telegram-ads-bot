import { Router } from "express";

const router = Router();

router.get("/miniapp", (_req, res) => {
  const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim() ?? "";

  const CPALEAD_ID      = process.env["CPALEAD_PLACEMENT_ID"] ?? "";
  const TOROX_SITE      = process.env["TOROX_SITE_ID"] ?? "";
  const TOROX_PLACE     = process.env["TOROX_PLACEMENT_ID"] ?? "";
  const ADGATE_ID       = process.env["ADGATE_PLACEMENT_ID"] ?? "";
  const OFFERTORO_SITE  = process.env["OFFERTORO_SITE_ID"] ?? "";
  const OFFERTORO_PLACE = process.env["OFFERTORO_PLACEMENT_ID"] ?? "";
  const LOOTABLY_ID     = process.env["LOOTABLY_PLACEMENT_ID"] ?? "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
<title>اربح نقاط</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:var(--tg-theme-bg-color,#0f0f1a);color:var(--tg-theme-text-color,#fff);min-height:100vh;overscroll-behavior:none;}
  .header{padding:16px;background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;}
  .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;}
  .user-info{flex:1;}
  .user-name{font-weight:700;font-size:.95rem;}
  .user-sub{font-size:.75rem;color:#9ca3af;margin-top:2px;}
  .balance-row{display:flex;gap:10px;padding:12px 16px;}
  .bal-card{flex:1;background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-radius:14px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,.07);}
  .bal-val{font-size:1.3rem;font-weight:800;color:#fbbf24;}
  .bal-lbl{font-size:.7rem;color:#9ca3af;margin-top:3px;}
  .progress-wrap{padding:0 16px 12px;}
  .progress-label{display:flex;justify-content:space-between;font-size:.75rem;color:#9ca3af;margin-bottom:6px;}
  .progress-bar{height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;}
  .progress-fill{height:100%;background:linear-gradient(90deg,#a78bfa,#7c3aed);border-radius:99px;transition:width .5s;}
  .tabs{display:flex;overflow-x:auto;background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-bottom:2px solid rgba(255,255,255,.07);-webkit-overflow-scrolling:touch;scrollbar-width:none;}
  .tabs::-webkit-scrollbar{display:none;}
  .tab{flex-shrink:0;padding:12px 18px;border:none;background:transparent;color:#9ca3af;font-size:.82rem;cursor:pointer;transition:all .2s;white-space:nowrap;}
  .tab.active{color:#a78bfa;border-bottom:2.5px solid #a78bfa;}
  .section{display:none;padding:10px;}
  .section.active{display:block;}
  .wall-frame{width:100%;min-height:calc(100vh - 220px);border:none;border-radius:12px;background:#fff;}
  .empty-wall{text-align:center;padding:50px 20px;color:#6b7280;line-height:2;}
  .empty-wall .icon{font-size:2.5rem;margin-bottom:10px;}
  .ref-card{background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-radius:16px;padding:18px;margin:6px 0;}
  .ref-title{font-weight:700;font-size:1rem;margin-bottom:8px;}
  .ref-link{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);border-radius:10px;padding:12px;font-size:.78rem;word-break:break-all;color:#c4b5fd;margin:10px 0;line-height:1.5;}
  .copy-btn{width:100%;padding:12px;background:linear-gradient(135deg,#a78bfa,#7c3aed);border:none;border-radius:12px;color:#fff;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:6px;}
  .copy-btn:active{opacity:.8;}
  .ref-stat{display:flex;justify-content:space-between;margin-top:14px;font-size:.85rem;}
  .ref-stat span{color:#9ca3af;}
  .ref-stat strong{color:#fbbf24;}
  .loading{display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px;}
  .spinner{width:36px;height:36px;border:3px solid rgba(167,139,250,.2);border-top-color:#a78bfa;border-radius:50%;animation:spin .8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 24px;border-radius:99px;font-size:.85rem;font-weight:600;opacity:0;transition:opacity .3s;z-index:999;}
  .toast.show{opacity:1;}
</style>
</head>
<body>

<div class="loading" id="loading">
  <div class="spinner"></div>
  <div style="color:#9ca3af;font-size:.85rem;">جاري التحميل...</div>
</div>

<div id="app" style="display:none">
  <div class="header">
    <div class="avatar" id="avatar">👤</div>
    <div class="user-info">
      <div class="user-name" id="userName">...</div>
      <div class="user-sub" id="userSub">...</div>
    </div>
  </div>

  <div class="balance-row">
    <div class="bal-card">
      <div class="bal-val" id="balPoints">0</div>
      <div class="bal-lbl">🪙 نقطة</div>
    </div>
    <div class="bal-card">
      <div class="bal-val" id="balUsdt">0.0000$</div>
      <div class="bal-lbl">💵 USDT</div>
    </div>
  </div>

  <div class="progress-wrap">
    <div class="progress-label">
      <span id="progressText">0/1000 نقطة للسحب</span>
      <span id="progressPct">0%</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
  </div>

  <div class="tabs" id="tabs"></div>
  <div id="sections"></div>
</div>

<div class="toast" id="toast"></div>

<script>
const BASE = "https://${domain}";
const NETWORKS = [
  ${CPALEAD_ID     ? `{ id:"cpalead",   label:"⚡ CPAlead",   url: uid => \`https://wall.cpalead.com/c/?id=${CPALEAD_ID}&sub1=\${uid}\` },` : ""}
  ${TOROX_SITE     ? `{ id:"torox",     label:"🔥 Torox",     url: uid => \`https://www.torox.io/ifr/show/${TOROX_PLACE}/${TOROX_SITE}/\${uid}\` },` : ""}
  ${ADGATE_ID      ? `{ id:"adgate",    label:"🏆 AdGate",    url: uid => \`https://wall.adgaterewards.com/${ADGATE_ID}?uid=\${uid}\` },` : ""}
  ${OFFERTORO_SITE ? `{ id:"offertoro", label:"💎 Offertoro", url: uid => \`https://www.offertoro.com/ifr/show/${OFFERTORO_PLACE}/${OFFERTORO_SITE}/\${uid}/\` },` : ""}
  ${LOOTABLY_ID    ? `{ id:"lootably",  label:"🎮 Lootably",  url: uid => \`https://wall.lootably.com/?placementID=${LOOTABLY_ID}&uid=\${uid}\` },` : ""}
];

const tg = window.Telegram?.WebApp;
if (tg) { tg.expand(); tg.ready(); }

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

async function init() {
  const user = tg?.initDataUnsafe?.user;
  if (!user?.id) {
    document.getElementById("loading").innerHTML =
      '<div style="text-align:center;padding:40px;color:#f87171">افتح هذه الصفحة من داخل تيليغرام فقط</div>';
    return;
  }

  // جلب / إنشاء المستخدم
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get("ref") || tg?.initDataUnsafe?.start_param || "";

  const resp = await fetch(BASE + "/api/webapp/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      referralCode: refCode,
    }),
  });
  const data = await resp.json();
  const uid = data.referralCode;

  // عرض معلومات المستخدم
  const name = user.first_name + (user.last_name ? " " + user.last_name : "");
  document.getElementById("avatar").textContent = (user.first_name?.[0] || "👤");
  document.getElementById("userName").textContent = name;
  document.getElementById("userSub").textContent = user.username ? "@" + user.username : "مستخدم جديد";

  // الرصيد
  document.getElementById("balPoints").textContent = Number(data.points).toLocaleString();
  document.getElementById("balUsdt").textContent = data.usdt + "$";
  const pct = Math.min(100, Math.round((data.points % 1000) / 10));
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = (data.points % 1000) + "/1000 نقطة للسحب";
  document.getElementById("progressPct").textContent = pct + "%";

  // بناء التابات
  const tabsCont = document.getElementById("tabs");
  const secCont  = document.getElementById("sections");

  const allTabs = [
    ...NETWORKS,
    { id:"referral", label:"👥 إحالة" },
  ];

  allTabs.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.className = "tab" + (i === 0 ? " active" : "");
    btn.textContent = t.label;
    btn.onclick = () => showTab(t.id, btn);
    tabsCont.appendChild(btn);

    const sec = document.createElement("div");
    sec.id = "sec-" + t.id;
    sec.className = "section" + (i === 0 ? " active" : "");

    if (t.id === "referral") {
      const botUsername = "${process.env['BOT_USERNAME'] ?? 'Arab_win_bot'}";
      const link = "https://t.me/" + botUsername + "?startapp=" + uid;
      sec.innerHTML = \`
        <div class="ref-card">
          <div class="ref-title">🎁 ادعُ أصدقاء واربح نقاطاً</div>
          <div class="ref-link" id="refLink">\${link}</div>
          <button class="copy-btn" onclick="copyRef('\${link}')">📋 انسخ الرابط</button>
          <div class="ref-stat">
            <span>مكافأة كل صديق</span>
            <strong>30 نقطة</strong>
          </div>
        </div>
        <div class="ref-card" style="margin-top:10px">
          <div class="ref-title">💡 كيف يعمل النظام؟</div>
          <div style="font-size:.82rem;color:#9ca3af;line-height:2;margin-top:8px">
            • شاهد إعلانات ← نقاط تلقائية فورية<br/>
            • ادعُ صديق ← 30 نقطة مجاناً<br/>
            • 1,000 نقطة = 1\$ USDT<br/>
            • اطلب السحب من البوت 💸
          </div>
        </div>\`;
    } else if (t.url) {
      if (NETWORKS.length === 0) {
        sec.innerHTML = '<div class="empty-wall"><div class="icon">⚙️</div>الشبكات غير مفعّلة بعد.<br/>تواصل مع الإدارة.</div>';
      } else {
        sec.innerHTML = \`<iframe class="wall-frame" src="\${t.url(uid)}" loading="lazy" allow="fullscreen"></iframe>\`;
      }
    }
    secCont.appendChild(sec);
  });

  document.getElementById("loading").style.display = "none";
  document.getElementById("app").style.display = "block";

  if (data.isNew) showToast("🎉 أهلاً بك! سجّلت بنجاح");
}

function showTab(id, btn) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById("sec-" + id).classList.add("active");
  btn.classList.add("active");
}

function copyRef(link) {
  navigator.clipboard?.writeText(link).then(() => showToast("✅ تم نسخ الرابط!"))
    .catch(() => {
      const inp = document.createElement("input");
      inp.value = link; document.body.appendChild(inp);
      inp.select(); document.execCommand("copy"); document.body.removeChild(inp);
      showToast("✅ تم نسخ الرابط!");
    });
}

init().catch(err => {
  console.error(err);
  document.getElementById("loading").innerHTML =
    '<div style="text-align:center;padding:40px;color:#f87171">خطأ في التحميل. أعد المحاولة.</div>';
});
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
