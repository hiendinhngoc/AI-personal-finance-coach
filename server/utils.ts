import { storage } from "./storage";
import { ExpenseDetail, ExpenseBudgetInformation } from "./llm";

export async function formatExpenses(userId: number, month: string): Promise<ExpenseBudgetInformation> {
    const [rawExpenses, budget] = await Promise.all([
        storage.getExpenses(userId, month),
        storage.getBudget(userId, month)
    ]);
    const totalExpenses = rawExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expensesByCategory = rawExpenses.reduce((acc, expense) => {
        if (!acc[expense.category]) {
            acc[expense.category] = 0;
        }
        acc[expense.category] += expense.amount;
        return acc;
    }, {} as Record<string, number>);

    const expenseDetails: ExpenseDetail[] = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount
    }));

    console.log(budget);

    return {
        month: parseInt(month),
        totalExpenses,
        expenseDetails,
        budget: budget?.totalAmount || 0
    };
}
