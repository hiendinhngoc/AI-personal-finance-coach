import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudLightningIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Markdown from "react-markdown";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BellIcon,
  LogOutIcon,
  PlusIcon,
  UploadIcon,
  ImageIcon,
  BarChart3Icon,
  ShoppingBasketIcon,
  CarIcon,
  HomeIcon,
  GamepadIcon,
  MoreHorizontalIcon,
  DollarSignIcon,
  Moon,
  Sun,
} from "lucide-react";
import type {
  Budget,
  Expense,
  Notification,
  InsertExpense,
} from "@shared/schema";
import type { LucideIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "@heroicons/react/24/solid";
import cn from "classnames";

const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Housing",
  "Entertainment",
  "Other",
];

const TIME_FILTERS = {
  ALL: "all",
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
} as const;

const CATEGORY_CONFIG = {
  Transportation: {
    color: "#3B82F6",
    gradient: "bg-gradient-to-r from-blue-400 to-blue-600",
    hoverGradient: "hover:from-blue-500 hover:to-blue-700",
    textColor: "text-white",
    icon: CarIcon,
  },
  Housing: {
    color: "#10B981",
    gradient: "bg-gradient-to-r from-green-400 to-green-600",
    hoverGradient: "hover:from-green-500 hover:to-green-700",
    textColor: "text-white",
    icon: HomeIcon,
  },
  Food: {
    color: "#F59E0B",
    gradient: "bg-gradient-to-r from-orange-400 to-orange-600",
    hoverGradient: "hover:from-orange-500 hover:to-orange-700",
    textColor: "text-white",
    icon: ShoppingBasketIcon,
  },
  Entertainment: {
    color: "#8B5CF6",
    gradient: "bg-gradient-to-r from-purple-400 to-purple-600",
    hoverGradient: "hover:from-purple-500 hover:to-purple-700",
    textColor: "text-white",
    icon: GamepadIcon,
  },
  Other: {
    color: "#6B7280",
    gradient: "bg-gradient-to-r from-gray-400 to-gray-600",
    hoverGradient: "hover:from-gray-500 hover:to-gray-700",
    textColor: "text-white",
    icon: MoreHorizontalIcon,
  },
} as const;

const CHART_COLORS = Object.values(CATEGORY_CONFIG).map(
  (config) => config.color
);

const CATEGORY_ICONS = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([key, value]) => [key, value.icon])
) as Record<string, LucideIcon>;

type TimeFilter = (typeof TIME_FILTERS)[keyof typeof TIME_FILTERS];

const getGreeting = () => {
  const hour = new Date().getHours();
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  if (hour < 12) return `Good morning • ${day}`;
  if (hour < 17) return `Good afternoon • ${day}`;
  return `Good evening • ${day}`;
};

const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const convertVNDtoUSD = (vndAmount: number) => {
  const rate = 24000;
  return (vndAmount / rate).toFixed(2);
};

const WEATHER_ICONS = {
  Clear: SunIcon,
  Clouds: CloudIcon,
  Rain: CloudRainIcon,
  Snow: CloudSnowIcon,
  Thunderstorm: CloudLightningIcon,
} as const;

const formatChartValue = (value: number) => {
  return formatCurrency(value);
};

export default function Dashboard() {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TIME_FILTERS.MONTH);
  const [month] = useState(new Date().toISOString().slice(0, 7));
  const { user, logoutMutation } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [isUploadingImage, setisUploadingImage] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("list");

  const { data: weather } = useQuery({
    queryKey: ["weather"],
    queryFn: () => fetch("/api/weather").then((res) => res.json()),
  });

  const { data: analysis } = useQuery<{
    financialAdviceReport: "";
    topSavingCategory: "";
    topSpendingCategory: "";
  }>({
    queryKey: [`/api/expenses/analysis/${month}`],
  });

  const {
    financialAdviceReport = "",
    topSavingCategory = "",
    topSpendingCategory = "",
  } = analysis || {};

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string)
          .replace("data:", "")
          .replace(/^.+,/, "");
        setImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitImage = async (image: string) => {
    setisUploadingImage(true);
    try {
      const res = await apiRequest("POST", "/api/test-ai", {
        prompt: "",
        image,
      });
      const data = await res.json();
      const response = data.response;
      if (response && response[0]) {
        const { amount: responseAmount, currency, category } = response[0];

        if (currency.toLowerCase() === "vnd") {
          setAmount(convertVNDtoUSD(responseAmount));
        } else {
          setAmount(responseAmount.toString());
        }

        if (category && EXPENSE_CATEGORIES.includes(category)) {
          setSelectedCategory(category);
        } else {
          setSelectedCategory("Other");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setisUploadingImage(false);
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

  const createChatMutation = useMutation({
    mutationFn: async ({
      message,
      threadId,
    }: {
      message: string;
      threadId: number;
    }) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        threadId,
      });
      return response;
    },
    onSuccess: async (data: any) => {
      const parsedData = await data.json();
      console.log("parsedData", parsedData.message);
      toast({ title: "Message sent successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      category: string;
      date: string;
      invoice?: File;
    }) => {
      const formData = new FormData();

      const expenseData: InsertExpense = {
        amount: data.amount,
        category: data.category,
        description: `Expense on ${new Date(data.date).toLocaleDateString()}`,
        receiptUrl: "",
        date: new Date(data.date),
      };

      if (data.invoice) {
        formData.append("invoice", data.invoice);
        formData.append("expense", JSON.stringify(expenseData));
        return apiRequest("POST", "/api/expenses/upload", formData);
      }

      return apiRequest("POST", "/api/expenses", expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/expenses/${timeFilter}`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/budget/${month}`] });
      setShowExpenseModal(false);
      toast({ title: "Expense logged successfully" });
      setIsSubmittingExpense(false);
    },
    onError: (error: any) => {
      console.error("Expense submission error:", error);
      toast({
        title: "Failed to add expense",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsSubmittingExpense(false);
    },
  });

  const handleExpenseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingExpense(true);
    const form = e.target as HTMLFormElement;
    const amount = parseFloat(form.amount.value);
    const category = form.category.value;

    if (amount > 0 && category) {
      createExpenseMutation.mutate({
        amount,
        category,
        date: selectedDate.toISOString(),
      });
      form.reset();
      setSelectedDate(new Date());
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthExpenses =
    expenses?.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    }) || [];

  const totalMonthlyExpenses = currentMonthExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const totalBudget = budget?.totalAmount || 0;
  const remainingBudget = totalBudget - totalMonthlyExpenses;

  const chartData = useMemo(() => {
    const normalizedData =
      expenses?.reduce((acc, expense) => {
        const normalizedCategory =
          expense.category.charAt(0).toUpperCase() +
          expense.category.slice(1).toLowerCase();

        if (!EXPENSE_CATEGORIES.includes(normalizedCategory)) {
          const existingCategory = acc.find(
            (item) => item.category === "Other"
          );
          if (existingCategory) {
            existingCategory.value += expense.amount;
          } else {
            acc.push({
              category: "Other",
              value: expense.amount,
            });
          }
        } else {
          const existingCategory = acc.find(
            (item) => item.category === normalizedCategory
          );
          if (existingCategory) {
            existingCategory.value += expense.amount;
          } else {
            acc.push({
              category: normalizedCategory,
              value: expense.amount,
            });
          }
        }
        return acc;
      }, [] as { category: string; value: number }[]) || [];

    normalizedData.sort((a, b) => a.category.localeCompare(b.category));

    console.log("Normalized Chart Data:", normalizedData);
    return normalizedData;
  }, [expenses]);

  const groupedExpenses =
    expenses?.reduce((groups, expense) => {
      const date = new Date(expense.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
      return groups;
    }, {} as Record<string, Expense[]>) || {};

  const sortedGroups = Object.entries(groupedExpenses).sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  useEffect(() => {
    if (image) {
      handleSubmitImage(image);
    }
  }, [image]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300'>
      <header className='sticky top-0 z-50 backdrop-blur-lg bg-white/75 dark:bg-gray-900/75 border-b border-gray-200/50 dark:border-gray-700/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='h-16 flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <img src='/cp.jpg' alt='Company Logo' className='h-8 w-auto' />
              <h1 className='text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
                AI Personal Finance Coach
              </h1>
            </div>

            <div className='flex items-center space-x-4'>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              >
                {theme === "dark" ? (
                  <Sun className='h-5 w-5' />
                ) : (
                  <Moon className='h-5 w-5' />
                )}
              </button>

              <Button
                variant='ghost'
                className='flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300 border border-transparent'
                onClick={() => setShowBudgetModal(true)}
              >
                <PlusIcon className='h-4 w-4' />
                Set Budget
              </Button>

              <Button
                variant='ghost'
                className='flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300 border border-transparent'
                onClick={() => setShowExpenseModal(true)}
              >
                <PlusIcon className='h-4 w-4' />
                Add Expense
              </Button>

              <Button
                variant='ghost'
                className='flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 rounded-full transition-all duration-300 border border-transparent'
                onClick={() => logoutMutation.mutate()}
              >
                <LogOutIcon className='h-4 w-4' />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>
            {getGreeting()}, {user?.username}
          </h2>
          {weather && (
            <div className='flex items-center space-x-2 text-gray-600 dark:text-gray-300'>
              {(() => {
                const WeatherIcon =
                  WEATHER_ICONS[weather.main as keyof typeof WEATHER_ICONS] ||
                  CloudIcon;
                return <WeatherIcon className='h-5 w-5' />;
              })()}
              <span>{weather.description}</span>
              <span>{Math.round(weather.temp)}°F</span>
            </div>
          )}
        </div>
      </div>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px]'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
              Monthly Budget
            </h3>
            <p className='mt-2 text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
              {formatCurrency(budget?.totalAmount || 0)}
            </p>
          </div>

          <div className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px]'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
              Total Expenses (This Month)
            </h3>
            <p className='mt-2 text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
              {formatCurrency(totalMonthlyExpenses)}
            </p>
          </div>

          <div className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px]'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
              Remaining Budget
            </h3>
            <p
              className={`mt-2 text-3xl font-bold ${
                remainingBudget >= 0
                  ? "bg-gradient-to-r from-green-400 to-green-600"
                  : "bg-gradient-to-r from-red-400 to-red-600 animate-pulse"
              } bg-clip-text text-transparent`}
            >
              {formatCurrency(remainingBudget)}
            </p>
          </div>
        </div>

        <div className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden'>
          <div className='p-6 border-b border-gray-200/50 dark:border-gray-700/50'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                Expenses & Invoices
              </h2>
              {activeTab !== "suggestions" && (
                <div className='flex gap-2'>
                  {Object.entries(TIME_FILTERS).map(([key, value]) => (
                    <Button
                      key={value}
                      variant={timeFilter === value ? "default" : "ghost"}
                      size='sm'
                      onClick={() => setTimeFilter(value as TimeFilter)}
                      className='rounded-full'
                    >
                      {key.charAt(0) + key.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue='list' className='p-6'>
            <TabsList className='grid w-full grid-cols-3 mb-6'>
              <TabsTrigger value='list'>Invoice List</TabsTrigger>
              <TabsTrigger value='chart'>Expense Chart</TabsTrigger>
              <TabsTrigger value='suggestions'>Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value='list'>
              {sortedGroups.map(([monthYear, monthExpenses]) => (
                <div key={monthYear} className='space-y-4'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 px-6'>
                    {new Date(monthYear).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </h3>

                  <div className='grid grid-cols-3 gap-4 py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400'>
                    <div>Category</div>
                    <div>Date</div>
                    <div className='text-right'>Amount</div>
                  </div>

                  <div className='space-y-2'>
                    {monthExpenses.map((expense) => {
                      const categoryConfig =
                        CATEGORY_CONFIG[
                          expense.category as keyof typeof CATEGORY_CONFIG
                        ];
                      const CategoryIcon = categoryConfig.icon;

                      return (
                        <div
                          key={expense.id}
                          className='group grid grid-cols-3 gap-4 p-4 rounded-xl backdrop-blur-sm bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
                        >
                          <div className='flex items-center gap-2'>
                            <div
                              className={`flex items-center gap-2 px-3 py-1 rounded-full ${categoryConfig.gradient} ${categoryConfig.textColor} transition-all duration-300 ${categoryConfig.hoverGradient}`}
                            >
                              <CategoryIcon className='h-4 w-4' />
                              <span className='font-medium'>
                                {expense.category}
                              </span>
                            </div>
                          </div>

                          <div className='flex items-center'>
                            <time className='text-sm text-gray-600 dark:text-gray-300'>
                              {formatDate(expense.date.toString())}
                            </time>
                          </div>

                          <div className='flex items-center justify-end'>
                            <span className='text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100'>
                              {formatCurrency(expense.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value='chart'>
              <div className='h-[400px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' opacity={0.1} />
                    <XAxis
                      dataKey='category'
                      tick={{ fill: theme === "dark" ? "#94a3b8" : "#475569" }}
                    />
                    <YAxis
                      tick={{ fill: theme === "dark" ? "#94a3b8" : "#475569" }}
                      tickFormatter={formatChartValue}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Amount",
                      ]}
                      contentStyle={{
                        backgroundColor:
                          theme === "dark" ? "#1f2937" : "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey='value' minPointSize={5}>
                      {chartData.map((entry, index) => {
                        const category =
                          entry.category as keyof typeof CATEGORY_CONFIG;
                        const color =
                          CATEGORY_CONFIG[category]?.color ||
                          CHART_COLORS[index % CHART_COLORS.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value='suggestions'>
              <div className='prose dark:prose-invert max-w-none'>
                {financialAdviceReport ? (
                  <>
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {financialAdviceReport}
                    </Markdown>

                    <div className='mt-8 grid grid-cols-2 gap-6'>
                      <div className='border border-green-200 bg-green-50/50 dark:bg-green-900/20 rounded-lg p-4'>
                        <h3 className='text-lg font-semibold text-green-700 dark:text-green-400'>
                          Top Saving Category
                        </h3>
                        <p className='text-green-600 dark:text-green-300'>
                          {topSavingCategory}
                        </p>
                      </div>

                      <div className='border border-red-200 bg-red-50/50 dark:bg-red-900/20 rounded-lg p-4'>
                        <h3 className='text-lg font-semibold text-red-700 dark:text-red-400'>
                          Watch Out
                        </h3>
                        <p className='text-red-600 dark:text-red-300'>
                          {topSpendingCategory}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='flex items-center justify-center h-40'>
                    <Loader2 className='h-8 w-8 animate-spin' />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      {showBudgetModal && (
        <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className='h-4 w-4 mr-2' />
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
              className='space-y-4'
            >
              <div>
                <Label htmlFor='amount'>Amount (USD)</Label>
                <Input
                  id='amount'
                  name='amount'
                  type='number'
                  min='0'
                  step='0.01'
                  required
                />
              </div>
              <Button type='submit'>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {showExpenseModal && (
        <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
          <DialogTrigger asChild>
            <Button className='w-full'>
              <PlusIcon className='h-4 w-4 mr-2' />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue='form' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='form'>Manual Entry</TabsTrigger>
                <TabsTrigger value='upload'>Upload Invoice</TabsTrigger>
              </TabsList>
              <TabsContent value='form'>
                <form onSubmit={handleExpenseSubmit} className='space-y-4'>
                  <div>
                    <Label htmlFor='amount'>Amount (USD)</Label>
                    <Input
                      id='amount'
                      name='amount'
                      type='number'
                      min='0'
                      step='0.01'
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor='category'>Category</Label>
                    <Select name='category' required>
                      <SelectTrigger>
                        <SelectValue placeholder='Select category' />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor='date'>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {selectedDate ? (
                            format(selectedDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button type='submit' className='w-full flex justify-center'>
                    {isSubmittingExpense ? (
                      <Loader2 className='h-8 w-8 animate-spin' />
                    ) : (
                      "Add Expense"
                    )}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value='upload'>
                <form onSubmit={handleExpenseSubmit} className='space-y-4'>
                  <div className='border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors'>
                    <input
                      name='invoice'
                      id='invoice'
                      className='hidden'
                      type='file'
                      accept='image/*'
                      onChange={handleImageChange}
                    />
                    <Label
                      htmlFor='invoice'
                      className='flex flex-col justify-center items-center gap-2 cursor-pointer'
                    >
                      {!isUploadingImage && !image && (
                        <>
                          <UploadIcon className='h-8 w8' />
                          <span>Click or drag to upload invoice</span>
                          <span className='text-sm text-muted-foreground'>
                            Supports: JPG and PNG
                          </span>
                        </>
                      )}
                      {isUploadingImage && (
                        <Loader2 className='h-8 w-8 animate-spin' />
                      )}

                      {!isUploadingImage && image && (
                        <div className='w-full flex-col max-h-20 flex justify-center items-center'>
                          <img
                            src={`data:image/jpeg;base64,${image}`}
                            alt='Uploaded preview'
                            className='max-w-xs rounded-lg shadow-md w-fit max-h-16'
                          />
                          <button
                            className='mx-auto px-2 py-1 mt-1 border border-black/10 rounded-md text-xs'
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setImage(null);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </Label>
                  </div>

                  {amount && (
                    <>
                      <div>
                        <Label htmlFor='amount'>Amount (USD)</Label>
                        <Input
                          id='amount'
                          name='amount'
                          type='number'
                          min='0'
                          step='0.01'
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor='category'>Category</Label>
                        <Select
                          name='category'
                          value={selectedCategory}
                          onValueChange={setSelectedCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select category' />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor='date'>Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant='outline'
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {selectedDate ? (
                                format(selectedDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0' align='start'>
                            <Calendar
                              mode='single'
                              selected={selectedDate}
                              onSelect={(date) => date && setSelectedDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button
                        type='submit'
                        className='w-full flex justify-center'
                      >
                        {isSubmittingExpense ? (
                          <Loader2 className='h-8 w-8 animate-spin' />
                        ) : (
                          "Add Expense"
                        )}
                      </Button>
                    </>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
