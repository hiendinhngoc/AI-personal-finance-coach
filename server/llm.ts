import { ChatOpenAI } from "@langchain/openai";
import { expenseItemSchema, type ExpenseItem } from "@shared/schema";

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

export async function generateVisionResponse(base64Image: string, prompt?: string): Promise<ExpenseItem> {
  try {
    const response = await visionLLM.invoke([
      {
        role: "system",
        content: `You are a receipt analyzer. Your task is to extract expense information from receipts and return it in a specific JSON format.

Instructions:
1. Analyze the receipt image
2. Extract the total amount (convert to a number)
3. Identify the currency (convert to: vnd, usd, or eur)
4. Determine the expense category (one of: food, transportation, utility, rent, health)
5. Format your response EXACTLY as shown below:

{
  "amount": 123.45,
  "currency": "usd",
  "category": "food"
}

IMPORTANT: 
- Only respond with the JSON object
- Do not include any explanations or additional text
- Use lowercase for currency and category
- Amount must be a number (not a string)
- Currency must be one of: vnd, usd, eur
- Category must be one of: food, transportation, utility, rent, health`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt || "Analyze this receipt and extract the expense information."
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

    console.log('Raw LLM response:', response.content);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response.content as string);
    } catch (parseError) {
      console.error('JSON Parse Error. Raw response:', response.content);
      throw new Error(`Failed to parse JSON response: ${response.content}`);
    }

    try {
      const validatedResponse = expenseItemSchema.parse(parsedResponse);
      return validatedResponse;
    } catch (validationError) {
      console.error('Validation Error:', validationError);
      throw new Error(`Response validation failed: ${validationError.message}`);
    }
  } catch (error) {
    console.error('Error generating vision response:', error);
    throw new Error(error.message || 'Failed to generate vision response');
  }
}