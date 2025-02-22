import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { BellIcon, LogOutIcon, PlusIcon, UploadIcon, ImageIcon, BarChart3Icon } from "lucide-react";
import type { Budget, Expense, Notification, InsertExpense } from "@shared/schema";
import type { ExpenseItem } from "@shared/schema";

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

const CHART_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD"
];

type TimeFilter = typeof TIME_FILTERS[keyof typeof TIME_FILTERS];

// Add this helper function at the top level, outside the component
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Function to convert VND to USD (or your preferred currency)
const convertVNDtoUSD = (vndAmount: number) => {
  // Using approximate conversion rate (you might want to use an API for real-time rates)
  const rate = 24000; // 1 USD = ~24000 VND
  return (vndAmount / rate).toFixed(2);
};

const Dashboard = () => {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TIME_FILTERS.MONTH);
  const [month] = useState(new Date().toISOString().slice(0, 7));
  const { user, logoutMutation } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  console.log(amount, selectedCategory)
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string)
          .replace('data:', '')
          .replace(/^.+,/, '');
        setImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitImage = async (image: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/test-ai", { prompt, image });
      const data = await res.json();
      const response = data.response;
      if (response && response[0]) {
        const { amount: responseAmount, currency, category } = response[0];
        
        // Todo: Currency convert
        // Convert amount if currency is VND
        if (currency.toLowerCase() === 'vnd') {
          setAmount(convertVNDtoUSD(responseAmount));
        } else {
          setAmount(responseAmount.toString());
        }
      
        // Set category if it's not 'none'
        if (category && EXPENSE_CATEGORIES.includes(category)) {
          setSelectedCategory(category);
        } else {
          setSelectedCategory("Other");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

    if (amount > 0 && category) {
      createExpenseMutation.mutate({ amount, category, date });
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

  useEffect(() => {
    if(image){
      handleSubmitImage(image)
    }
  }, [image])
  

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBudgetModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Set Budget
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Expense
              </button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <BellIcon className="h-4 w-4 mr-2" />
                    {notifications?.filter(n => !n.read).length || 0}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notifications</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {notifications?.map(notification => (
                      <div key={notification.id} className="p-4 bg-muted rounded-lg">
                        <p>{notification.message}</p>
                        <span className="text-sm text-muted-foreground">
                          {new Date(notification.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOutIcon className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {getGreeting()}, {user?.username}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Monthly Budget</h3>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${budget?.totalAmount.toFixed(2) || 0}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${expenses?.reduce((acc, expense) => acc + expense.amount, 0).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Remaining Budget</h3>
              <p className={`mt-1 text-2xl font-semibold ${
                budget?.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${budget?.remainingAmount.toFixed(2) || 0}
              </p>
            </div>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expenses & Invoices</CardTitle>
              <div className="flex gap-2">
                {Object.entries(TIME_FILTERS).map(([key, value]) => (
                  <Button
                    key={value}
                    variant={timeFilter === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter(value as TimeFilter)}
                  >
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="chart">
                  <BarChart3Icon className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list">
                <div className="space-y-4">
                  {expenses?.map(expense => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted"
                    >
                      <div>
                        <p className="font-medium">{expense.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-medium">${expense.amount}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="chart">
                <div className="h-[400px] flex items-center justify-center">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={150}
                          label={({ category, percent }) => 
                            `${category}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground">No expenses to display</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                    name="category" 
                    required
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}>
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
                      name="invoice"
                      id="invoice"
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <Label
                      htmlFor="invoice"
                      className="flex flex-col justify-center items-center gap-2 cursor-pointer"
                    >
                      {!isLoading && !image && (
                      <>
                        <UploadIcon className="h-8 w-8" />
                        <span>Click or drag to upload invoice</span>
                        <span className="text-sm text-muted-foreground">
                          Supports: JPG and PNG
                        </span>
                      </>
                      )}
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

                      {!isLoading && image && (
                        <div className="w-full flex-col max-h-20 flex justify-center items-center">
                          <img
                            src={`data:image/jpeg;base64,${image}`}
                            alt="Uploaded preview"
                            className="max-w-xs rounded-lg shadow-md w-fit max-h-16"
                          />
                          <button className="mx-auto px-2 py-1 mt-1 border border-black/10 rounded-md text-xs" onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setImage(null)
                            }}>
                            Remove
                          </button>
                        </div>
                      )}
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