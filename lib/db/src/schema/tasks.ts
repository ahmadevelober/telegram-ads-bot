import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "watch_ad" | "follow_channel" | "visit_link" | "other"
  url: text("url"),
  source: text("source"), // اسم الموقع المصدر
  usdtValue: numeric("usdt_value", { precision: 10, scale: 4 }), // القيمة الكاملة بالدولار
  rewardPoints: integer("reward_points").notNull().default(10), // 70% للمستخدم
  adminPoints: integer("admin_points").notNull().default(3),   // 30% للمدير (بالنقاط)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
