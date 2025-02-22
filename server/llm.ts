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
        content: prompt,
      },
    ]);
    return response.content as string;
  } catch (error) {
    console.error("Error generating text response:", error);
    throw new Error("Failed to generate text response");
  }
}

async function convertImageToText(base64Image: string): Promise<string> {
  try {
    const response = await visionLLM.invoke([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this receipt carefully and convert all the content to text. Include all relevant details like store name, date, items, prices, and totals."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ],
      }
    ]);

    return response.content as string;
  } catch (error: any) {
    console.error('Error converting image to text:', error);
    throw new Error('Failed to convert image to text: ' + error.message);
  }
}

export async function generateVisionResponse(
  base64Image: string,
  prompt?: string,
): Promise<ExpenseItem[]> {
  try {
    // Step 1: Convert image to text
    const extractedText = await convertImageToText(base64Image);
    console.log('Extracted text from image:', extractedText);

    // Step 2: Set up parser and prompt for converting text to structured data
    const parser = new JsonOutputParser<ExpenseItem[]>();
    const formatInstructions = `Respond with a valid JSON array of expense objects in the following format:
[
  {
    "amount": 123.45,
    "currency": "usd",
    "category": "food"
  },
  {
    "amount": 45.67,
    "currency": "vnd",
    "category": "transportation"
  }
]

Rules:
- Each item must have:
  - Amount as a number
  - Currency as one of: vnd, usd, eur (lowercase)
  - Category as one of: food, transportation, utility, rent, health (lowercase)
`;

    const prompt_template = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a receipt analyzer. Your task is to extract expense information from receipts.
${formatInstructions}`,
      ],
      [
        "user",
        prompt || "Analyze this receipt text and extract all expense items. Group similar items if needed.\n\nReceipt text:\n" + extractedText,
      ],
    ]);

    const chain = prompt_template.pipe(textLLM).pipe(parser);

    console.log("Running chain to extract expense items...");
    const structuredData = await chain.invoke({});
    console.log("Generated structured data:", structuredData);

    try {
      // Validate each item in the array
      const validatedItems = structuredData.map(item => expenseItemSchema.parse(item));
      return validatedItems;
    } catch (validationError: any) {
      console.error("Validation Error:", validationError);
      throw new Error(`Response validation failed: ${validationError.message}`);
    }
  } catch (error: any) {
    console.error("Error generating vision response:", error);
    throw new Error(error.message || "Failed to generate vision response");
  }
}