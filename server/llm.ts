import { ChatOpenAI } from "@langchain/openai";
import { ExpenseItem, expenseItemSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required");
}

export const textLLM = new ChatOpenAI({
  temperature: 0,
  topP: 0.7,
  maxTokens: 4000,
  modelName: "meta-llama/llama-3.3-70b-instruct",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

export const visionLLM = new ChatOpenAI({
  temperature: 0,
  topP: 0.7,
  maxTokens: 4000,
  modelName: "meta-llama/llama-3.2-90b-vision-instruct",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

export async function generateTextResponse(prompt: string): Promise<string> {
  try {
    const response = await textLLM.invoke([
      {
        role: "user",
        content: prompt
      }
    ]);
    return response.content as string;
  } catch (error) {
    console.error('Error generating text response:', error);
    throw new Error('Failed to generate text response');
  }
}

const responseSchema = z.object({
  items: z.array(expenseItemSchema),
  summary: z.string(),
});

export async function generateVisionResponse(base64Image: string, prompt?: string): Promise<{ items: ExpenseItem[], summary: string }> {
  try {
    const response = await visionLLM.invoke([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt || `Analyze this receipt and extract expense items. For each item, determine:
1. The amount (as a number)
2. The currency (must be one of: vnd, usd, eur)
3. The category (must be one of: food, transportation, utility, rent, health)

Provide your response in JSON format with two fields:
- items: array of extracted items with amount, currency, and category
- summary: brief description of the receipt

Example response format:
{
  "items": [
    {
      "amount": 10.99,
      "currency": "usd",
      "category": "food"
    }
  ],
  "summary": "Grocery store receipt from Walmart"
}`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ]);

    // Parse the response as JSON and validate against our schema
    const jsonResponse = JSON.parse(response.content as string);
    return responseSchema.parse(jsonResponse);
  } catch (error) {
    console.error('Error generating vision response:', error);
    throw new Error('Failed to generate vision response');
  }
}