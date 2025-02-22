import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const expenseItemSchema = z.object({
  amount: z.number().optional(),
  currency: z.enum(["vnd", "usd", "eur"]).optional(),
  category: z
    .enum(["Food", "Transportation", "Housing", "Entertainment", "Other"])
    .optional(),
});

export type ExpenseItem = z.infer<typeof expenseItemSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  remainingAmount: doublePrecision("remaining_amount").notNull(),
  month: text("month").notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  date: timestamp("date").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  date: timestamp("date").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).pick({
  totalAmount: true,
  month: true,
});

export const insertExpenseSchema = createInsertSchema(expenses)
  .pick({
    amount: true,
    category: true,
    description: true,
    receiptUrl: true,
  })
  .extend({
    date: z.coerce.date(),
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Notification = typeof notifications.$inferSelect;
