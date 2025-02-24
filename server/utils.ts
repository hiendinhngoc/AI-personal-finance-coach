import { storage } from "./storage";
import { ExpenseDetail, ExpenseBudgetInformation } from "./llm";

export async function formatExpenses(userId: number, month: string): Promise<ExpenseBudgetInformation> {
    try {
        const [rawExpenses, budget] = await Promise.all([
            storage.getExpenses(userId, 'month'), // Always get monthly expenses for budget context
            storage.getBudget(userId, new Date().toISOString().slice(0, 7)) // Get current month's budget
        ]);

        const totalExpenses = rawExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const expensesByCategory = rawExpenses.reduce((acc, expense) => {
            const normalizedCategory = expense.category.charAt(0).toUpperCase() + expense.category.slice(1).toLowerCase();
            if (!acc[normalizedCategory]) {
                acc[normalizedCategory] = 0;
            }
            acc[normalizedCategory] += expense.amount;
            return acc;
        }, {} as Record<string, number>);

        const expenseDetails: ExpenseDetail[] = Object.entries(expensesByCategory).map(([category, amount]) => ({
            category,
            amount
        }));

        console.log('Formatted Budget Data:', {
            month: parseInt(month),
            totalExpenses,
            expenseDetails,
            budget: budget?.totalAmount
        });

        return {
            month: parseInt(month),
            totalExpenses,
            expenseDetails,
            budget: budget?.totalAmount || 0
        };
    } catch (error) {
        console.error('Error formatting expenses:', error);
        return {
            month: parseInt(month),
            totalExpenses: 0,
            expenseDetails: [],
            budget: 0
        };
    }
}