import { Markup } from "telegraf";

export const mainKeyboard = Markup.keyboard([
  ["💰 رصيدي", "📋 المهام"],
  ["👥 الإحالة", "💸 سحب"],
  ["📊 إحصائياتي"],
]).resize();

export const adminKeyboard = Markup.keyboard([
  ["💰 رصيدي", "📋 المهام"],
  ["👥 الإحالة", "💸 سحب"],
  ["📊 إحصائياتي"],
  ["🔧 لوحة الإدارة"],
]).resize();

export const backKeyboard = Markup.keyboard([["🔙 رجوع"]]).resize();
