import { User, InsertUser, Budget, InsertBudget, Expense, InsertExpense, Notification } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private budgets: Map<number, Budget>;
  private expenses: Map<number, Expense>;
  private notifications: Map<number, Notification>;
  private currentId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.budgets = new Map();
    this.expenses = new Map();
    this.notifications = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBudget(userId: number, month: string): Promise<Budget | undefined> {
    return Array.from(this.budgets.values()).find(
      (budget) => budget.userId === userId && budget.month === month,
    );
  }

  async createBudget(userId: number, insertBudget: InsertBudget): Promise<Budget> {
    const id = this.currentId++;
    const budget: Budget = {
      ...insertBudget,
      id,
      userId,
      remainingAmount: insertBudget.totalAmount,
    };
    this.budgets.set(id, budget);
    return budget;
  }

  async updateBudget(id: number, remainingAmount: number): Promise<Budget> {
    const budget = this.budgets.get(id);
    if (!budget) throw new Error("Budget not found");
    const updatedBudget = { ...budget, remainingAmount };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }

  async getExpenses(userId: number, month: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(
      (expense) => expense.userId === userId && 
        new Date(expense.date).toISOString().startsWith(month),
    );
  }

  async createExpense(userId: number, insertExpense: InsertExpense): Promise<Expense> {
    const id = this.currentId++;
    const expense: Expense = {
      ...insertExpense,
      id,
      userId,
      date: new Date(),
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId,
    );
  }

  async createNotification(userId: number, message: string): Promise<Notification> {
    const id = this.currentId++;
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      date: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (!notification) throw new Error("Notification not found");
    this.notifications.set(id, { ...notification, read: true });
  }
}

export const storage = new MemStorage();
