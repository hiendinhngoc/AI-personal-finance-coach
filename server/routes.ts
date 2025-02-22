import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBudgetSchema, insertExpenseSchema } from "@shared/schema";
import {
  ExpenseDetail,
  ExpenseBudgetInformation,
  generateCostCuttingMeasureAdviseResponse,
  generateVisionResponse,
  textLLM,
  reformatJsonResponse,
} from "./llm";
import { formatExpenses } from "./utils";
import { initializeAgent, getMessage } from "./agent";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  const agent = await initializeAgent();

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
    const formattedExpenses = await formatExpenses(
      req.user.id,
      req.params.month,
    );
    const costCuttingMeasures =
      await generateCostCuttingMeasureAdviseResponse(formattedExpenses);
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
    const defaultWeather = {
      main: "Clear",
      description: "Sunny with no clouds",
      temp: 72.5,
      humidity: 60,
      windSpeed: 5.2,
    };
    try {
      const formatInstructions = `
      {
        "main": "Clear",
        "description": "Sunny with no clouds",
        "temp": 72.5,
        "humidity": 60,
        "windSpeed": 5.2
      }
      Rules:
      - main: Must be one of the following: "Clear", "Clouds", "Rain", "Snow", or "Thunderstorm".
      - description: A short text describing the weather conditions.
      - temp: Temperature in Fahrenheit as a number.
      - humidity: Humidity percentage as a number.
      - windSpeed: Wind speed in mph as a number.
      `;
      const response = await textLLM.invoke([
        {
          role: "system",
          content: `You are a weather API. Return only a JSON object with the current weather in San Francisco in the following format:
          ---
          JSON SCHEMA:
          ${formatInstructions}

          ---
          OUTPUT REQUIREMENTS:
          - Do NOT include any additional text, explanations, or metadata—return only the JSON object.`,
        },
        {
          role: "user",
          content: "What's the current weather in San Francisco?",
        },
      ]);
      const content = response.content as string;
      let weatherData = defaultWeather;
      try {
        weatherData = JSON.parse(content as string);
      } catch (e) {
        const fixedContent = await reformatJsonResponse(
          formatInstructions,
          content,
        );
        weatherData = JSON.parse(fixedContent);
      }
      res.json(weatherData);
    } catch (error) {
      console.error("Error fetching weather:", error);
      res.json(defaultWeather);
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      // Validate required parameters
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get parameters from request body instead of query
      const { message: userMessage, threadId } = req.body;

      if (!userMessage) {
        return res.status(400).json({ error: "Message parameter is required" });
      }

      if (!threadId) {
        return res.status(400).json({ error: "ThreadId parameter is required" });
      }

      // Use formatExpenses utility to transform the expenses
      // Get current month integer
      const month = new Date().getMonth() + 1;
      const currentFinancialData = await formatExpenses(req.user.id, month.toString());

      // Get response from agent
      const response = await getMessage(
        agent,
        currentFinancialData,
        parseInt(threadId),
        userMessage
      );

      console.log(response)

      if (!response) {
        return res.status(500).json({ error: "Failed to get response from agent" });
      }

      res.json({
        message: response
      });

    } catch (error) {
      console.error('Chat API Error:', error);
      res.status(500).json({
        error: "An error occurred while processing your request."
      });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
