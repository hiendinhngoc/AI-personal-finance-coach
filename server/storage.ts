import { User, InsertUser, Budget, InsertBudget, Expense, InsertExpense, Notification, users, budgets, expenses, notifications } from "@shared/schema";
import { db, eq, and } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getBudget(userId: number, month: string): Promise<Budget | undefined>;
  createBudget(userId: number, budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, remainingAmount: number): Promise<Budget>;

  getExpenses(userId: number, month: string): Promise<Expense[]>;
  createExpense(userId: number, expense: InsertExpense): Promise<Expense>;

  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(userId: number, message: string): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getBudget(userId: number, month: string): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.userId, userId),
        eq(budgets.month, month)
      ));
    return budget;
  }

  async createBudget(userId: number, insertBudget: InsertBudget): Promise<Budget> {
    const [budget] = await db
      .insert(budgets)
      .values({
        ...insertBudget,
        userId,
        remainingAmount: insertBudget.totalAmount,
      })
      .returning();
    return budget;
  }

  async updateBudget(id: number, remainingAmount: number): Promise<Budget> {
    const [budget] = await db
      .update(budgets)
      .set({ remainingAmount })
      .where(eq(budgets.id, id))
      .returning();
    return budget;
  }

  async getExpenses(userId: number, month: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId));
  }

  async createExpense(userId: number, insertExpense: InsertExpense): Promise<Expense> {
    // Get current month's budget
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budget = await this.getBudget(userId, currentMonth);

    // Create expense first
    const [expense] = await db
      .insert(expenses)
      .values({
        ...insertExpense,
        userId,
        date: new Date(),
      })
      .returning();

    // If budget exists, update it
    if (budget) {
      const newRemainingAmount = budget.remainingAmount - expense.amount;

      // Update the budget's remaining amount
      const [updatedBudget] = await db
        .update(budgets)
        .set({ remainingAmount: newRemainingAmount })
        .where(eq(budgets.id, budget.id))
        .returning();

      // Create notification if budget is low
      if (newRemainingAmount < updatedBudget.totalAmount * 0.2) {
        await this.createNotification(
          userId,
          "Warning: You have less than 20% of your budget remaining"
        );
      }
    }

    return expense;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
  }

  async createNotification(userId: number, message: string): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        message,
        read: false,
        date: new Date(),
      })
      .returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();