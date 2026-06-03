import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  network: text("network").notNull(), // "adgate" | "offertoro" | "lootably" | "cpalead"
  offerId: text("offer_id"),
  offerName: text("offer_name"),
  usdtAmount: numeric("usdt_amount", { precision: 10, scale: 4 }).notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  transactionId: text("transaction_id").unique(), // معرف فريد من الشبكة
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
