import type { User } from "@workspace/db";
import { pointsToUsdt, formatUsdt, POINTS_PER_USDT, USER_COMMISSION, ADMIN_COMMISSION } from "./helpers.js";

export function welcomeMessage(user: User, isNew: boolean): string {
  const name = user.firstName ?? user.username ?? "صديق";
  if (isNew) {
    return (
      `🎉 أهلاً وسهلاً ${name}!\n\n` +
      `مرحباً بك في بوت الربح من الإنترنت 🚀\n\n` +
      `💡 *نظام النقاط:*\n` +
      `1000 نقطة = 1$ USDT\n\n` +
      `يمكنك كسب النقاط عبر:\n` +
      `📋 تنفيذ المهام من مواقع موثوقة\n` +
      `👁️ مشاهدة الإعلانات\n` +
      `👥 دعوة الأصدقاء (+30 نقطة لكل صديق)\n\n` +
      `اضغط على الأزرار أدناه للبدء! 👇`
    );
  }
  return `👋 أهلاً ${name}! اختر ما تريد من القائمة:`;
}

export function balanceMessage(points: number, referralCount: number): string {
  const usdt = pointsToUsdt(points);
  return (
    `💰 *رصيدك الحالي*\n\n` +
    `🪙 النقاط: *${points.toLocaleString()}* نقطة\n` +
    `💵 القيمة: *${formatUsdt(usdt)}$ USDT*\n` +
    `👥 الأصدقاء المدعوون: *${referralCount}*\n\n` +
    `📊 سعر الصرف: 1000 نقطة = 1$ USDT\n` +
    `💡 الحد الأدنى للسحب: 1,000 نقطة (1$)`
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
  const status = done ? "✅ مكتملة" : "⏳ لم تُنجز";
  const usdtEarning = task.usdtValue
    ? `≈ ${formatUsdt(parseFloat(task.usdtValue) * USER_COMMISSION)}$ USDT`
    : "";
  const sourceTag = task.source ? `🌐 المصدر: *${task.source}*\n` : "";

  return (
    `${emoji} *${task.title}*\n` +
    `📝 ${task.description}\n` +
    `${sourceTag}` +
    `🏆 مكافأتك: *${task.rewardPoints}* نقطة ${usdtEarning}\n` +
    `الحالة: ${status}\n` +
    `(${index}/${total})`
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
    `رابط الإحالة الخاص بك:\n` +
    `\`${link}\`\n\n` +
    `👫 الأصدقاء المدعوون: *${referralCount}*\n` +
    `🎁 مكافأة كل صديق: *30* نقطة (3 سنت)\n\n` +
    `شارك الرابط واربح مع كل صديق يسجل! 🚀`
  );
}

export function commissionInfoMessage(): string {
  const userPct = Math.round(USER_COMMISSION * 100);
  const adminPct = Math.round(ADMIN_COMMISSION * 100);
  return (
    `📊 *نظام العمولة*\n\n` +
    `🧮 سعر الصرف: *${POINTS_PER_USDT} نقطة = 1$ USDT*\n\n` +
    `✂️ توزيع الأرباح:\n` +
    `👤 المستخدم: *${userPct}%*\n` +
    `🏦 المنصة: *${adminPct}%*\n\n` +
    `مثال: مهمة قيمتها 0.01$:\n` +
    `• أنت تكسب: ${Math.round(0.01 * USER_COMMISSION * POINTS_PER_USDT)} نقطة (0.007$)\n` +
    `• المنصة: ${Math.round(0.01 * ADMIN_COMMISSION * POINTS_PER_USDT)} نقاط (0.003$)`
  );
}
