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

export async function generateVisionResponse(base64Image: string, prompt: string): Promise<string> {
  try {
    const response = await visionLLM.invoke([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt || "Analyze this image in detail and describe what you see."
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
    return response.content as string;
  } catch (error) {
    console.error('Error generating vision response:', error);
    throw new Error('Failed to generate vision response');
  }
}