import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
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
    const parser = new JsonOutputParser<ExpenseItem>();
    const formatInstructions = `Respond with a valid JSON object in the following format:
{
  "amount": 123.45,
  "currency": "usd",
  "category": "food"
}

Rules:
- Amount must be a number
- Currency must be one of: vnd, usd, eur (lowercase)
- Category must be one of: food, transportation, utility, rent, health (lowercase)
`;

    const prompt_template = ChatPromptTemplate.fromMessages([
      ["system", `You are a receipt analyzer. Your task is to extract expense information from receipts.
${formatInstructions}`],
      ["user", prompt || "Analyze this receipt and extract the expense information."],
    ]);

    const chain = prompt_template
      .pipe(visionLLM)
      .pipe(parser);

    const messages = await prompt_template.formatMessages({
      image: {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      }
    });

    console.log('Raw LLM response:', messages);

    try {
      const validatedResponse = expenseItemSchema.parse(messages);
      return validatedResponse;
    } catch (validationError: any) {
      console.error('Validation Error:', validationError);
      throw new Error(`Response validation failed: ${validationError.message}`);
    }
  } catch (error: any) {
    console.error('Error generating vision response:', error);
    throw new Error(error.message || 'Failed to generate vision response');
  }
}