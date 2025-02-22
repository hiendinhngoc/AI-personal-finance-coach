import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  BellIcon, LogOutIcon, PlusIcon, UploadIcon, ImageIcon, BarChart3Icon,
  ShoppingBasketIcon, CarIcon, HomeIcon, GamepadIcon, MoreHorizontalIcon,
  DollarSignIcon, Moon, Sun
} from "lucide-react";
import type { Budget, Expense, Notification, InsertExpense } from "@shared/schema";
import type { LucideIcon } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Housing",
  "Entertainment",
  "Other"
];

const TIME_FILTERS = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month"
} as const;

// Add gradient styles for categories
const CATEGORY_CONFIG = {
  Transportation: {
    color: "#3B82F6",
    gradient: "bg-gradient-to-r from-blue-400 to-blue-600",
    hoverGradient: "hover:from-blue-500 hover:to-blue-700",
    textColor: "text-white",
    icon: CarIcon
  },
  Housing: {
    color: "#10B981",
    gradient: "bg-gradient-to-r from-green-400 to-green-600",
    hoverGradient: "hover:from-green-500 hover:to-green-700",
    textColor: "text-white",
    icon: HomeIcon
  },
  Food: {
    color: "#F59E0B",
    gradient: "bg-gradient-to-r from-orange-400 to-orange-600",
    hoverGradient: "hover:from-orange-500 hover:to-orange-700",
    textColor: "text-white",
    icon: ShoppingBasketIcon
  },
  Entertainment: {
    color: "#8B5CF6",
    gradient: "bg-gradient-to-r from-purple-400 to-purple-600",
    hoverGradient: "hover:from-purple-500 hover:to-purple-700",
    textColor: "text-white",
    icon: GamepadIcon
  },
  Other: {
    color: "#6B7280",
    gradient: "bg-gradient-to-r from-gray-400 to-gray-600",
    hoverGradient: "hover:from-gray-500 hover:to-gray-700",
    textColor: "text-white",
    icon: MoreHorizontalIcon
  }
} as const;

// Replace existing CHART_COLORS with the new category colors
const CHART_COLORS = Object.values(CATEGORY_CONFIG).map(config => config.color);

// Replace existing CATEGORY_ICONS with the new configuration
const CATEGORY_ICONS = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([key, value]) => [key, value.icon])
) as Record<string, LucideIcon>;

type TimeFilter = typeof TIME_FILTERS[keyof typeof TIME_FILTERS];

// Add this helper function at the top level, outside the component
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Add a currency formatter helper
const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// Add a date formatter helper
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
};

const Dashboard = () => {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TIME_FILTERS.MONTH);
  const [month] = useState(new Date().toISOString().slice(0, 7));
  const { user, logoutMutation } = useAuth();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { theme, setTheme } = useTheme();

  const { data: budget } = useQuery<Budget>({
    queryKey: [`/api/budget/${month}`],
  });

  const { data: expenses } = useQuery<Expense[]>({
    queryKey: [`/api/expenses/${timeFilter}`],
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (amount: number) => {
      await apiRequest("POST", "/api/budget", {
        totalAmount: amount,
        month,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/budget/${month}`] });
      toast({ title: "Budget created successfully" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: { amount: number; category: string; date: string; invoice?: File }) => {
      const formData = new FormData();

      const expenseData: InsertExpense = {
        amount: data.amount,
        category: data.category,
        description: `Expense on ${new Date(data.date).toLocaleDateString()}`,
        receiptUrl: ""  // Will be updated by backend if invoice is present
      };

      // If there's an invoice, append it to formData
      if (data.invoice) {
        formData.append('invoice', data.invoice);
        formData.append('expense', JSON.stringify(expenseData));
        return apiRequest("POST", "/api/expenses/upload", formData);
      }

      // If no invoice, send expense data directly
      return apiRequest("POST", "/api/expenses", expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${timeFilter}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/budget/${month}`] });
      setExpenseModalOpen(false);
      toast({ title: "Expense logged successfully" });
    },
    onError: (error: any) => {
      console.error('Expense submission error:', error);
      toast({ 
        title: "Failed to add expense",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleExpenseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const amount = parseFloat(form.amount.value);
    const category = form.category.value;
    const date = form.date.value || new Date().toISOString();
    const invoice = form.invoice?.files?.[0];

    if (amount > 0 && category) {
      createExpenseMutation.mutate({ amount, category, date, invoice });
      form.reset();
    }
  };

  // Group expenses by category for pie chart
  const chartData = expenses?.reduce((acc, expense) => {
    const existingCategory = acc.find(item => item.category === expense.category);
    if (existingCategory) {
      existingCategory.value += expense.amount;
    } else {
      acc.push({
        category: expense.category,
        value: expense.amount
      });
    }
    return acc;
  }, [] as { category: string; value: number }[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/75 dark:bg-gray-900/75 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <Button
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-white/20 
                         dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300"
                onClick={() => setShowBudgetModal(true)}
              >
                <PlusIcon className="h-4 w-4" />
                Set Budget
              </Button>

              <Button
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-white/20 
                         dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300"
                onClick={() => setShowExpenseModal(true)}
              >
                <PlusIcon className="h-4 w-4" />
                Add Expense
              </Button>

              <div className="relative">
                <Button
                  variant="ghost"
                  className="relative flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-white/20 
                           dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300"
                  onClick={() => {/* handle notifications */}}
                >
                  <BellIcon className="h-4 w-4" />
                  {notifications && notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-white/20 
                         dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOutIcon className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Budget Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 
                       shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300
                       hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Budget</h3>
            <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {formatCurrency(budget?.totalAmount || 0)}
            </p>
          </div>

          <div className="backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 
                       shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300
                       hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</h3>
            <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {formatCurrency(expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0)}
            </p>
          </div>

          <div className="backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 
                       shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300
                       hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Budget</h3>
            <p className={`mt-2 text-3xl font-bold ${
              (budget?.remainingAmount || 0) >= 0 
                ? 'bg-gradient-to-r from-green-400 to-green-600'
                : 'bg-gradient-to-r from-red-400 to-red-600 animate-pulse'
              } bg-clip-text text-transparent`}>
              {formatCurrency(budget?.remainingAmount || 0)}
            </p>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl 
                     shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Expenses & Invoices</h2>
              <div className="flex gap-2">
                {Object.entries(TIME_FILTERS).map(([key, value]) => (
                  <Button
                    key={value}
                    variant={timeFilter === value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeFilter(value as TimeFilter)}
                    className="rounded-full"
                  >
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                <div>Category</div>
                <div>Date</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Currency</div>
              </div>

              <div className="space-y-2">
                {expenses?.map(expense => {
                  const categoryConfig = CATEGORY_CONFIG[expense.category as keyof typeof CATEGORY_CONFIG];
                  const CategoryIcon = categoryConfig.icon;
                  
                  return (
                    <div
                      key={expense.id}
                      className="group grid grid-cols-4 gap-4 p-4 rounded-xl 
                               backdrop-blur-sm bg-white/40 dark:bg-gray-800/40
                               hover:bg-white/60 dark:hover:bg-gray-800/60
                               transition-all duration-300 transform hover:scale-[1.02]
                               hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full
                                    ${categoryConfig.gradient} ${categoryConfig.textColor}
                                    transition-all duration-300 ${categoryConfig.hoverGradient}`}>
                          <CategoryIcon className="h-4 w-4" />
                          <span className="font-medium">{expense.category}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <time className="text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(expense.date.toString())}
                        </time>
                      </div>
                      
                      <div className="flex items-center justify-end">
                        <span className="text-lg font-semibold tracking-tight">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-end">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium
                                     opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          USD
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showBudgetModal && (
        <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Set Monthly Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Monthly Budget</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const amount = parseFloat(form.amount.value);
                if (amount > 0) {
                  createBudgetMutation.mutate(amount);
                }
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {showExpenseModal && (
        <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="form" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload">Upload Invoice</TabsTrigger>
              </TabsList>
              <TabsContent value="form">
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="datetime-local"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Expense</Button>
                </form>
              </TabsContent>
              <TabsContent value="upload">
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="datetime-local"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      name="invoice"
                      id="invoice"
                      className="hidden"
                      accept="image/*"
                    />
                    <Label
                      htmlFor="invoice"
                      className="flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <UploadIcon className="h-8 w-8" />
                      <span>Click or drag to upload invoice</span>
                      <span className="text-sm text-muted-foreground">
                        Supports: JPG, PNG, PDF
                      </span>
                    </Label>
                  </div>
                  <Button type="submit" className="w-full">Upload & Process</Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Dashboard;