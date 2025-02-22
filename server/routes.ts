import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBudgetSchema, insertExpenseSchema } from "@shared/schema";
import {
  ExpenseDetail, ExpenseBudgetInformation,
  generateCostCuttingMeasureAdviseResponse,
  generateVisionResponse,
  textLLM,
} from "./llm";

async function formatExpenses(userId: number, month: string): Promise<ExpenseBudgetInformation> {
  const [rawExpenses, budget] = await Promise.all([
    storage.getExpenses(userId, month),
    storage.getBudget(userId, month)
  ]);
  const totalExpenses = rawExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesByCategory = rawExpenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    acc[expense.category] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const expenseDetails: ExpenseDetail[] = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    amount
  }));

  return {
    month: parseInt(month),
    totalExpenses,
    expenseDetails,
    budget: budget?.totalAmount || 0
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/budget/:month", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const budget = await storage.getBudget(req.user.id, req.params.month);
    res.json(budget || null);
  });

  app.post("/api/budget", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parseResult = insertBudgetSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }
    const budget = await storage.createBudget(req.user.id, parseResult.data);
    res.status(201).json(budget);
  });

  app.get("/api/expenses/analysis/:month", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const formattedExpenses = await formatExpenses(req.user.id, req.params.month);
    const costCuttingMeasures = await generateCostCuttingMeasureAdviseResponse(formattedExpenses);
    res.json(costCuttingMeasures);
  });

  app.get("/api/expenses/:month", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const expenses = await storage.getExpenses(req.user.id, req.params.month);
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parseResult = insertExpenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }
    const expense = await storage.createExpense(req.user.id, parseResult.data);

    // Update remaining budget
    const budget = await storage.getBudget(
      req.user.id,
      new Date().toISOString().slice(0, 7),
    );
    if (budget) {
      const newRemainingAmount = budget.remainingAmount - expense.amount;
      await storage.updateBudget(budget.id, newRemainingAmount);
      if (newRemainingAmount < budget.totalAmount * 0.2) {
        await storage.createNotification(
          req.user.id,
          "Warning: You have less than 20% of your budget remaining",
        );
      }
    }

    res.status(201).json(expense);
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notifications = await storage.getNotifications(req.user.id);
    res.json(notifications);
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markNotificationRead(parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.post("/api/test-ai", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { prompt, image } = req.body;

      if (!prompt && !image) {
        return res.status(400).json({ error: "Prompt or image is required" });
      }

      let response;
      if (image) {
        response = await generateVisionResponse(image, prompt);
      } else {
        const expenseBudgetInformation: ExpenseBudgetInformation = {
          budget: 10000000,
          month: 1,
          totalExpenses: 13000000,
          expenseDetails: [
            { category: "food", amount: 3000000 },
            { category: "education", amount: 7000000 },
            { category: "utitly", amount: 3000000 },
          ],
        };
        response = await generateCostCuttingMeasureAdviseResponse(
          expenseBudgetInformation,
        );
      }

      res.json({ response });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  app.get("/api/weather", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const response = await textLLM.invoke([
        {
          role: "system",
          content: "You are a weather API. Return only a JSON object with the current weather in San Francisco with these fields: main (Clear/Clouds/Rain/Snow/Thunderstorm), description, temp (in Fahrenheit), humidity, windSpeed.",
        },
        {
          role: "user",
          content: "What's the current weather in San Francisco?",
        },
      ]);

      const weatherData = JSON.parse(response.content as string);
      res.json(weatherData);
    } catch (error) {
      console.error("Error fetching weather:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}