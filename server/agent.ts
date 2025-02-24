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
        console.log('Current Financial Data:', currentFinancialData);

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
                        Monthly Budget: ${formatCurrency(currentFinancialData.budget)}
                        Total Expenses This Month: ${formatCurrency(currentFinancialData.totalExpenses)}
                        Remaining Budget: ${formatCurrency(currentFinancialData.budget - currentFinancialData.totalExpenses)}

                        Expense Breakdown:
                        ${currentFinancialData.expenseDetails?.map(detail => 
                            `${detail.category}: ${formatCurrency(detail.amount)}`
                        ).join('\n')}
                        ---
                        Respond concisely under 100 words
                        Always acknowledge the user's current budget and expenses in your responses.
                        If the budget is exceeded, provide specific advice on reducing expenses.
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

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}