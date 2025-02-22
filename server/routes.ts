import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBudgetSchema, insertExpenseSchema } from "@shared/schema";
import { ExpenseBudgetInformation, generateCostCuttingMeasureAdviseResponse, generateVisionResponse } from "./llm";
import multer from "multer";

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

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
    res.status(201).json(expense);
  });

  app.post("/api/expenses/upload", upload.single('invoice'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Get the base64 encoded image from the request
      const base64Image = req.file?.buffer.toString('base64');
      if (!base64Image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Process image with Vision API
      const expenseData = await generateVisionResponse(base64Image);

      // Create expense if extracted data is valid
      if (expenseData && Array.isArray(expenseData) && expenseData.length > 0) {
        const expense = expenseData[0]; // Take first expense item
        const parseResult = insertExpenseSchema.safeParse({
          amount: expense.amount || 0,
          category: expense.category || 'Other',
          description: `Invoice uploaded on ${new Date().toLocaleDateString()}`,
          receiptUrl: "", // TODO: Implement file storage
        });

        if (!parseResult.success) {
          return res.status(400).json(parseResult.error);
        }

        const createdExpense = await storage.createExpense(req.user.id, parseResult.data);
        return res.status(201).json({
          expense: createdExpense,
          extracted: expenseData[0]
        });
      }

      res.status(400).json({ error: "Could not extract expense data from image" });
    } catch (error) {
      console.error("Error processing expense upload:", error);
      res.status(500).json({ error: "Failed to process expense upload" });
    }
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
            { category: "utitly", amount: 3000000 }
          ]
        };
        response = await generateCostCuttingMeasureAdviseResponse(expenseBudgetInformation);
      }

      res.json({ response });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}