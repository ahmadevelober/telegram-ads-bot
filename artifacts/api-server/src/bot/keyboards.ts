import { Markup } from "telegraf";

export const mainKeyboard = Markup.keyboard([
  ["💰 رصيدي", "📋 المهام"],
  ["📺 شاهد إعلانات", "💸 سحب"],
  ["👥 الإحالة", "📊 إحصائياتي"],
  ["📈 نظام النقاط"],
]).resize();

export const adminKeyboard = Markup.keyboard([
  ["💰 رصيدي", "📋 المهام"],
  ["📺 شاهد إعلانات", "💸 سحب"],
  ["👥 الإحالة", "📊 إحصائياتي"],
  ["📈 نظام النقاط", "🔧 لوحة الإدارة"],
]).resize();
