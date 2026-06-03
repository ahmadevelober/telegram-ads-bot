import { Markup } from "telegraf";

export const mainKeyboard = Markup.keyboard([
  ["💰 رصيدي", "📋 المهام"],
  ["👥 الإحالة", "💸 سحب"],
  ["📊 إحصائياتي", "📈 نظام النقاط"],
]).resize();

export const adminKeyboard = Markup.keyboard([
  ["💰 رصيدي", "📋 المهام"],
  ["👥 الإحالة", "💸 سحب"],
  ["📊 إحصائياتي", "📈 نظام النقاط"],
  ["🔧 لوحة الإدارة"],
]).resize();
