import { ChatOpenAI } from "@langchain/openai";

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
  modelName: "openai/gpt-4o",
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

export async function reformatJsonResponse(
  formatInstructions: string,
  content: string
): Promise<string> {
  try {
    const response = await textLLM.invoke([
      {
        role: "system",
        content: `You are an expert in extracting structured data from raw text.Your task is to convert the given RAW DATA into a JSON object that follows the specified schema.

      ---
      ### JSON SCHEMA:
      ${formatInstructions}

      ### Instructions:
      - Extract only relevant data.
      - Ensure all values strictly match the schema's data types and format.
      - Do NOT add any extra information or explanations.
      - Respond ONLY with a valid JSON object that conforms to the schema.
      `,
      },
      {
        role: "user",
        content: `### RAW DATA:
      ${content}`,
      },
    ]);
    return response.content as string;
  } catch (error) {
    console.error("Error generating text response:", error);
    throw new Error("Failed to generate text response");
  }
}

export interface ExpenseDetail {
  category?: string;
  amount?: number;
}

export interface ExpenseBudgetInformation {
  budget?: number;
  month?: number;
  totalExpenses?: number;
  expenseDetails?: Array<ExpenseDetail | null>;
}

export async function generateCostCuttingMeasureAdviseResponse(
  budgetExpenseDetailsThisMonth: ExpenseBudgetInformation,
  budgetExpenseDetailsLastMonth: ExpenseBudgetInformation
): Promise<{ financialAdviceReport: string, topSavingCategory: string, topSpendingCategory: string }> {
  let parsedContent = { financialAdviceReport: "Sorry, I couldn't find any advice for you. Please try again later.", topSavingCategory: "None", topSpendingCategory: "None" };

  try {
    const formatInstructions = `Respond with a valid JSON objects in the following format:
    {
      "topSavingCategory":  "Housing expenses are lower than usual this month",
      "topSpendingCategory":  "Entertainment spending is 30% higher than last month"
    }
    
    Rules:
    - topSavingCategory as a string.  topSavingCategory is the lowest spending expense category in the current month (if any) 
    - topSpendingCategory as a string: topSpendingCategor is the top spending expense category in the current month (if any)
    - DO NOT make up false information. 
    `;

    const financialAdviceReportInvoker = textLLM.invoke([
      {
        role: "system",
        content: `
        You are a financial consultant. Your task is to provide clients with some effective cost cutting measures for their monthly expense. 
        You will be given detailed information about EXPENSE BUDGET INFORMATION of the current month and previous month.
        
        ---
        OUTPUT REQUIREMENTS: 
        DO NOT make up false information.
        Give assessment about their current financial situations, detailed advices about 
        cost cutting measures only and make a comparison of the current and previous month, in markdown format. 
        Using proper headings, sections, table, bullets to clarify your answer.
        
        `,
      },
      {
        role: "user",
        content: `
        EXPENSE BUDGET INFORMATION:
        current month: ${JSON.stringify(
          budgetExpenseDetailsThisMonth
        )}, previous month:  ${JSON.stringify(budgetExpenseDetailsLastMonth)}
        `,
      },
    ]);

    const costCategoryInvoker = textLLM.invoke([
      {
        role: "system",
        content: `
        You are a financial consultant. Your task is to identify Top Saving Category and Top Spending Category from the provided EXPENSE BUDGET INFORMATION of the current month and previous month.
        ---
        JSON SCHEMA:
        ${formatInstructions}

        ### Instructions:
       - Extract only relevant data.
       - Ensure all values strictly match the schema's data types and format.
       - Do NOT add any extra information or explanations.
       - Respond ONLY with a valid JSON object that conforms to the schema
        `,
      },
      {
        role: "user",
        content: `
        EXPENSE BUDGET INFORMATION:
        current month: ${JSON.stringify(
          budgetExpenseDetailsThisMonth
        )}, previous month:  ${JSON.stringify(budgetExpenseDetailsLastMonth)}
        `,
      },
    ]);

    const [financialAdviceReportResponse, costCategoryResponse] = await Promise.all([
      financialAdviceReportInvoker,
      costCategoryInvoker,
    ])

    const financialAdviceReportResponseContent = financialAdviceReportResponse.content as string;
    const costCategoryResponseContent = costCategoryResponse.content as string;

    try {
      parsedContent = JSON.parse(costCategoryResponseContent.replace("json", "").replace(/```/g, ""));
    } catch {
      // Call text_llm to fix error json content
      const fixedContent = await reformatJsonResponse(
        formatInstructions,
        costCategoryResponseContent
      );
      parsedContent = JSON.parse(fixedContent.replace("json", "").replace(/```/g, ""));
    }
    return {
      financialAdviceReport: financialAdviceReportResponseContent,
      topSavingCategory: parsedContent.topSavingCategory,
      topSpendingCategory: parsedContent.topSpendingCategory
    };

  } catch (error) {
    console.error("Error generating text response:", error);
    return parsedContent;
  }
}

export async function extractTextFromImage(
  base64Image: string,
  prompt: string = "Analyze this receipt and extract the text."
): Promise<string> {
  try {
    const response = await visionLLM.invoke([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Identify and extractthe following information from the given image:

              1. **Amount (if any)** (as a number)
              2. **Currency (if any)** (such as "vnd", "usd", "eur", lowercase)
              3. **Description (if any)** (such as "buying food", "buying bus ticket", "buying utility")
              ---
              ### Rules:
              - Do NOT include explanations or additional text.
              - Do NOT make up false information
              `,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ]);
    return response.content as string;
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw new Error("Failed to extract text from image.");
  }
}

export async function parseExpenseItems(extractedText: string): Promise<any> {
  try {
    const formatInstructions = `Respond with a valid JSON array of expense objects in the following format:
[
  {
    "amount": 123.45,
    "currency": "usd",
    "category": "Food"
  },
  {
    "amount": 45.67,
    "currency": "vnd",
    "category": "Transportation"
  }
]

Rules:
- Each item must have:
  - Amount as a number
  - Currency as one of: vnd, usd, eur (lowercase)
  - Category as one of:  Food , Transportation , Housing , Entertainment , or Other 
`;

    const messages = [
      {
        role: "system",
        content: `You are a receipt analyzer. Your task is to extract structured expense data from plain text as specified in JSON SCHEMA.

      ---
      JSON SCHEMA
      ${formatInstructions}

      ### Instructions:
       - Extract only relevant data.
       - Ensure all values strictly match the schema's data types and format.
       - Do NOT add any extra information or explanations.
       - Respond ONLY with a valid JSON object that conforms to the schema.
    `,
      },
      {
        role: "user",
        content: extractedText,
      },
    ];
    const parsedResponse = await textLLM.invoke(messages);
    const content = parsedResponse.content as string;
    console.log("Raw response:", content);
    let parsedContent = {};
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // Call text_llm to fix error json content
      const fixedContent = await reformatJsonResponse(
        formatInstructions,
        content
      );
      parsedContent = JSON.parse(fixedContent);
    }
    return parsedContent;
  } catch (error) {
    console.error("Error parsing expense items:", error);
    throw new Error("Failed to parse expense items.");
  }
}

export async function generateVisionResponse(
  base64Image: string,
  prompt?: string
): Promise<any> {
  try {
    const extractedText = await extractTextFromImage(base64Image, prompt);
    console.log("Extracted Text:", extractedText);
    const parsedExpense = await parseExpenseItems(extractedText);
    console.log("parsedExpense:", parsedExpense);
    return parsedExpense;
  } catch (validationError: any) {
    console.error("Validation Error:", validationError);
    throw new Error(`Response validation failed: ${validationError.message}`);
  }
}


