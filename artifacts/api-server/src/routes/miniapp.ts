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
  const BOT_USERNAME    = "Arab_win_bot";

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
.header{padding:14px 16px;background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;}
.avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;font-weight:700;}
.user-info{flex:1;}
.user-name{font-weight:700;font-size:.92rem;}
.user-sub{font-size:.72rem;color:#9ca3af;margin-top:2px;}
.balance-row{display:flex;gap:10px;padding:12px 16px 8px;}
.bal-card{flex:1;background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-radius:14px;padding:12px;text-align:center;border:1px solid rgba(255,255,255,.07);}
.bal-val{font-size:1.25rem;font-weight:800;color:#fbbf24;}
.bal-lbl{font-size:.68rem;color:#9ca3af;margin-top:3px;}
.progress-wrap{padding:0 16px 10px;}
.progress-label{display:flex;justify-content:space-between;font-size:.72rem;color:#9ca3af;margin-bottom:5px;}
.progress-bar{height:5px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;}
.progress-fill{height:100%;background:linear-gradient(90deg,#a78bfa,#7c3aed);border-radius:99px;transition:width .5s;}
.tabs{display:flex;overflow-x:auto;background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-bottom:2px solid rgba(255,255,255,.06);-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.tabs::-webkit-scrollbar{display:none;}
.tab{flex-shrink:0;padding:11px 16px;border:none;background:transparent;color:#9ca3af;font-size:.8rem;cursor:pointer;transition:all .2s;white-space:nowrap;}
.tab.active{color:#a78bfa;border-bottom:2.5px solid #a78bfa;}
.section{display:none;padding:10px;}
.section.active{display:block;}
.wall-frame{width:100%;min-height:calc(100vh - 230px);border:none;border-radius:12px;background:#fff;}
.card{background:var(--tg-theme-secondary-bg-color,#1a1a2e);border-radius:16px;padding:16px;margin:0 0 10px;}
.card-title{font-weight:700;font-size:.95rem;margin-bottom:10px;}
.ref-link{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);border-radius:10px;padding:11px;font-size:.76rem;word-break:break-all;color:#c4b5fd;margin:8px 0;line-height:1.6;}
.btn-main{width:100%;padding:13px;background:linear-gradient(135deg,#a78bfa,#7c3aed);border:none;border-radius:12px;color:#fff;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:6px;}
.btn-main:active{opacity:.8;}
.btn-main:disabled{opacity:.4;cursor:not-allowed;}
.stat-row{display:flex;justify-content:space-between;margin-top:12px;font-size:.83rem;}
.stat-row span{color:#9ca3af;}
.stat-row strong{color:#fbbf24;}
/* سحب */
.method-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0;}
.method-card{background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;text-align:center;cursor:pointer;transition:all .2s;}
.method-card.selected{border-color:#a78bfa;background:rgba(167,139,250,.12);}
.method-card .m-icon{font-size:1.6rem;margin-bottom:6px;}
.method-card .m-name{font-size:.8rem;font-weight:700;color:#e5e7eb;}
.method-card .m-sub{font-size:.68rem;color:#9ca3af;margin-top:3px;}
.input-wrap{margin:10px 0;}
.input-lbl{font-size:.78rem;color:#9ca3af;margin-bottom:6px;}
.wallet-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px;color:#fff;font-size:.82rem;direction:ltr;text-align:left;}
.wallet-input:focus{outline:none;border-color:#a78bfa;}
.wallet-input::placeholder{color:#4b5563;}
.warn-box{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px;font-size:.78rem;color:#fbbf24;line-height:1.6;margin:10px 0;}
.success-box{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:20px;text-align:center;margin-top:10px;}
.success-box .s-icon{font-size:2.5rem;margin-bottom:8px;}
.success-box .s-title{font-weight:700;font-size:1rem;color:#6ee7b7;margin-bottom:6px;}
.success-box .s-sub{font-size:.8rem;color:#9ca3af;line-height:1.6;}
.no-balance{text-align:center;padding:30px 20px;}
.no-balance .nb-icon{font-size:2.5rem;margin-bottom:10px;}
.no-balance .nb-title{font-weight:700;font-size:.95rem;color:#f87171;margin-bottom:8px;}
.no-balance .nb-sub{font-size:.8rem;color:#9ca3af;line-height:1.8;}
/* loading / toast */
.loading{display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px;}
.spinner{width:34px;height:34px;border:3px solid rgba(167,139,250,.2);border-top-color:#a78bfa;border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 22px;border-radius:99px;font-size:.82rem;font-weight:600;opacity:0;transition:opacity .3s;z-index:999;white-space:nowrap;}
.toast.error{background:#ef4444;}
.toast.show{opacity:1;}
</style>
</head>
<body>

<div class="loading" id="loading">
  <div class="spinner"></div>
  <div style="color:#9ca3af;font-size:.82rem;">جاري التحميل...</div>
</div>

<div id="app" style="display:none">
  <div class="header">
    <div class="avatar" id="avatar">?</div>
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
const MIN_W = 1000;
const NETWORKS = [
  ${CPALEAD_ID     ? `{ id:"cpalead",   label:"⚡ CPAlead",   url: uid => \`https://wall.cpalead.com/c/?id=${CPALEAD_ID}&sub1=\${uid}\` },` : ""}
  ${TOROX_SITE     ? `{ id:"torox",     label:"🔥 Torox",     url: uid => \`https://www.torox.io/ifr/show/${TOROX_PLACE}/${TOROX_SITE}/\${uid}\` },` : ""}
  ${ADGATE_ID      ? `{ id:"adgate",    label:"🏆 AdGate",    url: uid => \`https://wall.adgaterewards.com/${ADGATE_ID}?uid=\${uid}\` },` : ""}
  ${OFFERTORO_SITE ? `{ id:"offertoro", label:"💎 Offertoro", url: uid => \`https://www.offertoro.com/ifr/show/${OFFERTORO_PLACE}/${OFFERTORO_SITE}/\${uid}/\` },` : ""}
  ${LOOTABLY_ID    ? `{ id:"lootably",  label:"🎮 Lootably",  url: uid => \`https://wall.lootably.com/?placementID=${LOOTABLY_ID}&uid=\${uid}\` },` : ""}
];

const tg = window.Telegram?.WebApp;
if (tg) { tg.expand(); tg.ready(); }

let currentUser = null;
let userData = null;

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.className = "toast" + (type ? " " + type : "");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

function buildWithdrawSection(sec) {
  const points = userData?.points ?? 0;
  if (points < MIN_W) {
    sec.innerHTML = \`
      <div class="no-balance">
        <div class="nb-icon">🔒</div>
        <div class="nb-title">الرصيد غير كافٍ</div>
        <div class="nb-sub">
          رصيدك الحالي: <strong style="color:#fbbf24">\${points.toLocaleString()} نقطة</strong><br/>
          الحد الأدنى للسحب: <strong style="color:#a78bfa">1,000 نقطة = 1\$ USDT</strong><br/><br/>
          شاهد المزيد من الإعلانات لتصل للحد الأدنى 💪
        </div>
      </div>\`;
    return;
  }

  const usdtVal = (points / 1000).toFixed(4);
  sec.innerHTML = \`
    <div class="card">
      <div class="card-title">💸 طلب سحب</div>
      <div style="font-size:.82rem;color:#9ca3af;margin-bottom:12px">
        رصيدك: <strong style="color:#fbbf24">\${points.toLocaleString()} نقطة ≈ \${usdtVal}\$ USDT</strong>
      </div>

      <div style="font-size:.8rem;color:#9ca3af;margin-bottom:8px;font-weight:600">اختر شبكة الاستلام:</div>
      <div class="method-grid">
        <div class="method-card selected" id="m-trc20" onclick="selectMethod('USDT TRC20','m-trc20')">
          <div class="m-icon">💚</div>
          <div class="m-name">USDT TRC20</div>
          <div class="m-sub">شبكة Tron</div>
        </div>
        <div class="method-card" id="m-bep20" onclick="selectMethod('USDT BEP20','m-bep20')">
          <div class="m-icon">💛</div>
          <div class="m-name">USDT BEP20</div>
          <div class="m-sub">شبكة BSC</div>
        </div>
      </div>

      <div class="input-wrap">
        <div class="input-lbl">📬 عنوان المحفظة</div>
        <input class="wallet-input" id="walletAddr" type="text" placeholder="Txxx... أو 0x..." autocomplete="off" spellcheck="false"/>
      </div>

      <div class="warn-box">
        ⚠️ تأكد من صحة العنوان والشبكة — أي خطأ يؤدي لضياع الأموال نهائياً
      </div>

      <button class="btn-main" id="withdrawBtn" onclick="submitWithdraw()">
        💸 تأكيد طلب السحب
      </button>
    </div>\`;
}

let selectedMethod = "USDT TRC20";
function selectMethod(name, id) {
  selectedMethod = name;
  document.querySelectorAll(".method-card").forEach(c => c.classList.remove("selected"));
  document.getElementById(id)?.classList.add("selected");
}

async function submitWithdraw() {
  const addr = document.getElementById("walletAddr")?.value?.trim();
  if (!addr || addr.length < 10) {
    showToast("❌ أدخل عنوان محفظة صحيح", "error"); return;
  }
  const btn = document.getElementById("withdrawBtn");
  btn.disabled = true;
  btn.textContent = "⏳ جاري الإرسال...";

  try {
    const resp = await fetch(BASE + "/api/webapp/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: currentUser.id,
        method: selectedMethod,
        address: addr,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) { showToast("❌ " + (data.error || "خطأ"), "error"); btn.disabled = false; btn.textContent = "💸 تأكيد طلب السحب"; return; }

    // نجاح — عرض رسالة وتحديث الرصيد
    userData.points = 0;
    document.getElementById("balPoints").textContent = "0";
    document.getElementById("balUsdt").textContent = "0.0000$";
    document.getElementById("progressFill").style.width = "0%";
    document.getElementById("progressText").textContent = "0/1000 نقطة للسحب";
    document.getElementById("progressPct").textContent = "0%";

    const sec = document.getElementById("sec-withdraw");
    sec.innerHTML = \`
      <div class="success-box">
        <div class="s-icon">✅</div>
        <div class="s-title">تم إرسال الطلب بنجاح!</div>
        <div class="s-sub">
          المبلغ: <strong style="color:#fbbf24">\${data.usdt}\$ USDT</strong><br/>
          الشبكة: \${selectedMethod}<br/>
          المحفظة: <span style="direction:ltr;display:inline-block">\${addr}</span><br/><br/>
          سيتم التحويل خلال 24-48 ساعة 🙏
        </div>
      </div>\`;
  } catch (e) {
    showToast("❌ خطأ في الاتصال", "error");
    btn.disabled = false;
    btn.textContent = "💸 تأكيد طلب السحب";
  }
}

async function init() {
  const user = tg?.initDataUnsafe?.user;
  if (!user?.id) {
    document.getElementById("loading").innerHTML =
      '<div style="text-align:center;padding:40px;color:#f87171;font-size:.9rem">افتح هذه الصفحة من داخل تيليغرام فقط</div>';
    return;
  }
  currentUser = user;

  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get("ref") || tg?.initDataUnsafe?.start_param || "";

  const resp = await fetch(BASE + "/api/webapp/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId: user.id, firstName: user.first_name, lastName: user.last_name, username: user.username, referralCode: refCode }),
  });
  userData = await resp.json();
  const uid = userData.referralCode;

  // رأس الصفحة
  const name = user.first_name + (user.last_name ? " " + user.last_name : "");
  document.getElementById("avatar").textContent = user.first_name?.[0]?.toUpperCase() || "?";
  document.getElementById("userName").textContent = name;
  document.getElementById("userSub").textContent = user.username ? "@" + user.username : "مستخدم";

  // الرصيد
  const pts = userData.points ?? 0;
  document.getElementById("balPoints").textContent = pts.toLocaleString();
  document.getElementById("balUsdt").textContent = userData.usdt + "$";
  const pct = Math.min(100, Math.round((pts % 1000) / 10));
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = (pts % 1000) + "/1000 نقطة للسحب";
  document.getElementById("progressPct").textContent = pct + "%";

  // بناء التابات
  const tabsCont = document.getElementById("tabs");
  const secCont  = document.getElementById("sections");

  const allTabs = [
    ...NETWORKS,
    { id:"referral", label:"👥 إحالة" },
    { id:"withdraw", label:"💸 سحب" },
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
      const link = "https://t.me/${BOT_USERNAME}?startapp=" + uid;
      sec.innerHTML = \`
        <div class="card">
          <div class="card-title">🎁 ادعُ أصدقاء واربح نقاطاً</div>
          <div class="ref-link">\${link}</div>
          <button class="btn-main" onclick="copyRef('\${link}')">📋 انسخ الرابط</button>
          <div class="stat-row"><span>مكافأة كل صديق</span><strong>30 نقطة</strong></div>
        </div>
        <div class="card">
          <div class="card-title">💡 كيف يعمل النظام؟</div>
          <div style="font-size:.8rem;color:#9ca3af;line-height:2.1;margin-top:6px">
            • شاهد إعلانات ← نقاط تلقائية فورية ⚡<br/>
            • ادعُ صديق ← 30 نقطة مجاناً 🎁<br/>
            • 1,000 نقطة = 1\$ USDT 💵<br/>
            • اسحب من تاب السحب 💸
          </div>
        </div>\`;

    } else if (t.id === "withdraw") {
      buildWithdrawSection(sec);

    } else if (t.url) {
      sec.innerHTML = NETWORKS.length === 0
        ? '<div style="text-align:center;padding:40px;color:#6b7280">⚙️ الشبكات غير مفعّلة بعد</div>'
        : \`<iframe class="wall-frame" src="\${t.url(uid)}" loading="lazy" allow="fullscreen"></iframe>\`;
    }

    secCont.appendChild(sec);
  });

  document.getElementById("loading").style.display = "none";
  document.getElementById("app").style.display = "block";
  if (userData.isNew) showToast("🎉 أهلاً بك! سجّلت بنجاح");
}

function showTab(id, btn) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById("sec-" + id).classList.add("active");
  btn.classList.add("active");
}

function copyRef(link) {
  navigator.clipboard?.writeText(link)
    .then(() => showToast("✅ تم نسخ الرابط!"))
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
