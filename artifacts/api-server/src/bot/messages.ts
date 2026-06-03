import type { User } from "@workspace/db";
import { pointsToUsdt, formatUsdt, POINTS_PER_USDT, USER_COMMISSION, ADMIN_COMMISSION } from "./helpers.js";

export function welcomeMessage(user: User, isNew: boolean): string {
  const name = user.firstName ?? user.username ?? "صديق";
  if (isNew) {
    return (
      `🎉 *أهلاً ${name}!*\n\n` +
      `مرحباً بك في بوت الكسب الأوتوماتيكي 💰\n\n` +
      `🪙 *كيف يعمل البوت؟*\n` +
      `• أنجز مهام أو شاهد إعلانات → تكسب نقاط\n` +
      `• ادعُ أصدقاء → 30 نقطة لكل صديق\n` +
      `• اجمع 1000 نقطة = 1$ USDT ← تسحبها\n\n` +
      `💸 النقاط تُضاف *تلقائياً* بعد كل إنجاز!\n\n` +
      `اختر من القائمة أدناه للبدء 👇`
    );
  }
  return `👋 *أهلاً ${name}!* اختر ما تريد من القائمة:`;
}

export function balanceMessage(points: number, referralCount: number): string {
  const usdt = pointsToUsdt(points);
  const progress = Math.min(100, Math.round((points % 1000) / 10));
  const bar = "▓".repeat(Math.round(progress / 10)) + "░".repeat(10 - Math.round(progress / 10));
  return (
    `💰 *رصيدك*\n\n` +
    `🪙 النقاط: *${points.toLocaleString()}* نقطة\n` +
    `💵 القيمة: *${formatUsdt(usdt)}$ USDT*\n\n` +
    `📊 تقدمك نحو السحب التالي:\n` +
    `${bar} ${progress}%\n` +
    `(${points % 1000}/1000 نقطة)\n\n` +
    `👥 الأصدقاء المدعوون: *${referralCount}*\n` +
    `💡 الحد الأدنى للسحب: *1,000 نقطة (1$)*`
  );
}

export function noTasksMessage(): string {
  return "😔 لا توجد مهام متاحة حالياً.\nتابعنا لاحقاً!";
}

export function taskMessage(
  task: {
    id: number;
    title: string;
    description: string;
    type: string;
    rewardPoints: number;
    usdtValue: string | null;
    source: string | null;
    url: string | null;
  },
  index: number,
  total: number,
  done: boolean,
): string {
  const typeEmoji: Record<string, string> = {
    watch_ad: "📺",
    follow_channel: "📢",
    visit_link: "🔗",
    other: "✅",
  };
  const emoji = typeEmoji[task.type] ?? "✅";
  const status = done ? "✅ مكتملة" : "⏳ في الانتظار";
  const usdtEarning = task.usdtValue
    ? ` (≈ ${formatUsdt(parseFloat(task.usdtValue) * USER_COMMISSION)}$)`
    : "";
  const sourceTag = task.source ? `🌐 ${task.source}\n` : "";

  return (
    `${emoji} *${task.title}*\n` +
    `${sourceTag}` +
    `📝 ${task.description}\n` +
    `🏆 مكافأتك: *${task.rewardPoints.toLocaleString()} نقطة*${usdtEarning}\n` +
    `${status}   •   ${index}/${total}`
  );
}

export function referralMessage(
  code: string,
  botUsername: string,
  referralCount: number,
): string {
  const link = `https://t.me/${botUsername}?start=${code}`;
  return (
    `👥 *نظام الإحالة*\n\n` +
    `🔗 رابطك الخاص:\n` +
    `\`${link}\`\n\n` +
    `📊 الأصدقاء المسجّلون: *${referralCount}*\n` +
    `🎁 مكافأة كل صديق يسجل: *30 نقطة*\n\n` +
    `💡 شارك الرابط في أي مكان —\n` +
    `ستُضاف النقاط *تلقائياً* حين يضغط أحدهم /start 🚀`
  );
}

export function commissionInfoMessage(): string {
  const userPct = Math.round(USER_COMMISSION * 100);
  const adminPct = Math.round(ADMIN_COMMISSION * 100);
  return (
    `📈 *نظام النقاط والكسب*\n\n` +
    `🪙 *سعر الصرف:*\n` +
    `10 نقاط = 1 سنت\n` +
    `1,000 نقطة = 1$ USDT\n\n` +
    `✂️ *توزيع كل إعلان:*\n` +
    `👤 أنت تأخذ: *${userPct}%*\n` +
    `🏦 المنصة: *${adminPct}%*\n\n` +
    `📋 *طرق الكسب:*\n` +
    `• شاهد إعلانات ← نقاط تلقائية فورية\n` +
    `• أنجز مهام ← نقاط ثابتة\n` +
    `• ادعُ أصدقاء ← 30 نقطة/صديق\n\n` +
    `💸 *السحب:* USDT (TRC20) عبر طلب من البوت`
  );
}

export function helpMessage(): string {
  return (
    `📖 *دليل البوت*\n\n` +
    `*الأزرار الرئيسية:*\n` +
    `💰 رصيدي — رصيدك الحالي ونسبة التقدم\n` +
    `📋 المهام — مهام يدوية اضغط وأنجز\n` +
    `📺 شاهد إعلانات — أعلى ربح، تلقائي 100%\n` +
    `👥 الإحالة — رابطك + عدد أصدقائك\n` +
    `💸 سحب — اطلب تحويل USDT\n` +
    `📊 إحصائياتي — سجل نشاطك الكامل\n\n` +
    `*قواعد السحب:*\n` +
    `• الحد الأدنى: 1,000 نقطة = 1$\n` +
    `• الدفع عبر USDT (TRC20)\n` +
    `• المراجعة خلال 24-48 ساعة\n\n` +
    `❓ مشكلة؟ تواصل مع الدعم عبر الإدارة.`
  );
}
