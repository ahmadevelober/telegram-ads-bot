import { Markup } from "telegraf";

export const mainKeyboard = Markup.keyboard([
  ["💰 رصيدي", "💸 سحب"],
  ["👥 الإحالة", "📊 إحصائياتي"],
  ["📈 نظام النقاط"],
]).resize();

export const adminKeyboard = Markup.keyboard([
  ["💰 رصيدي", "💸 سحب"],
  ["👥 الإحالة", "📊 إحصائياتي"],
  ["📈 نظام النقاط", "🔧 لوحة الإدارة"],
]).resize();
