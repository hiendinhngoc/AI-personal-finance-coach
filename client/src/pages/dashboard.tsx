import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

type TimeFilter = typeof TIME_FILTERS[keyof typeof TIME_FILTERS];

export default function Dashboard() {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TIME_FILTERS.MONTH);
  const [month] = useState(new Date().toISOString().slice(0, 7));
  const { user, logoutMutation } = useAuth();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

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

  const chartData = expenses?.map(expense => ({
    date: new Date(expense.date).toLocaleDateString(),
    amount: expense.amount
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img src="/cp.jpg" alt="Company Logo" className="h-8 w-auto cursor-pointer" />
            </Link>
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-lg text-muted-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, 
              {user?.username} ⛅
            </p>
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

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {budget ? (
                <div className="space-y-4">
                  <p>Total Budget: ${budget.totalAmount}</p>
                  <p>Remaining: ${budget.remainingAmount}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>No budget set for this month</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Set Budget
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
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
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
            </CardContent>
          </Card>
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
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}