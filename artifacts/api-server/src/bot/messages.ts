import type { User } from "@workspace/db";

export function welcomeMessage(user: User, isNew: boolean): string {
  const name = user.firstName ?? user.username ?? "صديق";
  if (isNew) {
    return (
      `🎉 أهلاً وسهلاً ${name}!\n\n` +
      `مرحباً بك في بوت الربح من الإنترنت 🚀\n\n` +
      `يمكنك كسب النقاط عبر:\n` +
      `📋 تنفيذ المهام\n` +
      `👁️ مشاهدة الإعلانات\n` +
      `👥 دعوة الأصدقاء (+50 نقطة لكل صديق)\n\n` +
      `💡 اضغط على الأزرار أدناه للبدء!`
    );
  }
  return `👋 أهلاً ${name}! اختر ما تريد من القائمة:`;
}

export function balanceMessage(points: number, referralCount: number): string {
  return (
    `💰 *رصيدك الحالي*\n\n` +
    `🪙 النقاط: *${points.toLocaleString()}* نقطة\n` +
    `👥 الأصدقاء المدعوون: *${referralCount}*\n\n` +
    `💡 الحد الأدنى للسحب: 1,000 نقطة`
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

  return (
    `${emoji} *${task.title}*\n` +
    `📝 ${task.description}\n` +
    `🏆 المكافأة: *${task.rewardPoints}* نقطة\n` +
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
    `🎁 مكافأة كل صديق: *50* نقطة\n\n` +
    `شارك الرابط واربح مع كل صديق يسجل! 🚀`
  );
}
