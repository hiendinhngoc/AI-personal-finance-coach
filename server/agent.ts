import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { CompiledStateGraph } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ExpenseBudgetInformation } from "./llm";

export const initializeAgent = async () => {
    console.log('Initializing AI agent...');
    try {
        const agentModel = new ChatOpenAI({
            temperature: 0,
            topP: 0.7,
            maxTokens: 4000,
            modelName: "meta-llama/llama-3.3-70b-instruct",
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: process.env.OPENROUTER_API_KEY,
            },
        });

        // Initialize memory to persist state between graph runs
        const agentCheckpointer = new MemorySaver();
        const agent = createReactAgent({
            llm: agentModel,
            tools: [],
            checkpointSaver: agentCheckpointer,
        });

        console.log('AI agent initialized successfully');
        return agent;
    } catch (error) {
        console.error('Failed to initialize AI agent:', error);
        throw error;
    }
}

export const getMessage = async (agent: CompiledStateGraph<any, any>, currentFinancialData: ExpenseBudgetInformation, threadId: number, userQuestion: string) => {
    try {
        console.log(`Processing message for thread ${threadId}`);
        const agentState = await agent.invoke(
            {
                messages: [
                    new SystemMessage(
                        `You are a financial expert that can help me with my financial goals.
                        I will give you my current financial data and you will give me advice on how to save money.
                        You can also ask me questions about my financial data. 
                        You will be given full data on my current financial situation.
                        ---
                        Here is my current financial data: 
                        ${JSON.stringify(currentFinancialData)}
                        ---
                        Respond concisely under 100 words
                        `,
                    ),
                    new HumanMessage(userQuestion)
                ]
            },
            { configurable: { thread_id: threadId } },
        );

        console.log(`Message processed successfully for thread ${threadId}`);
        return agentState.messages[agentState.messages.length - 1].content;
    } catch (error) {
        console.error(`Error processing message for thread ${threadId}:`, error);
        return "Sorry, I couldn't find any advice for you. Please try again later.";
    }
}