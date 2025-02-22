import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { ChartPieIcon, SunIcon, MoonIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { z } from "zod";

const authFormSchema = insertUserSchema.extend({
  username: z.string()
    .min(1, "Username or email is required")
    .transform((val) => val.toLowerCase().trim())
    .refine((val) => {
      const isEmail = z.string().email().safeParse(val).success;
      const isValidUsername = /^[a-zA-Z0-9_]{3,}$/.test(val);
      return isEmail || isValidUsername;
    }, {
      message: "Must be a valid email or username (minimum 3 characters, only letters, numbers, and underscore)",
    }),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const form = useForm<InsertUser>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (type: "login" | "register") => {
    const handler = async (data: InsertUser) => {
      if (type === "login") {
        await loginMutation.mutateAsync(data);
      } else {
        await registerMutation.mutateAsync(data);
      }
    };
    return form.handleSubmit(handler);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <header className='sticky top-0 z-50 backdrop-blur-lg bg-white/75 dark:bg-gray-900/75 border-b border-gray-200/50 dark:border-gray-700/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='h-16 flex items-center justify-between'>
            <div className="flex items-center space-x-4">
              <img src="/cp.jpg" alt="Company Logo" className="h-8 w-auto" />
              <h1 className='text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
                AI Personal Finance Coach
              </h1>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            >
              {theme === "dark" ? (
                <SunIcon className='h-5 w-5' />
              ) : (
                <MoonIcon className='h-5 w-5' />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <img src="/cp.jpg" alt="Company Logo" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Welcome to AI Personal Finance Coach
              </CardTitle>
              <CardDescription className="text-center">
                Track your expenses and manage your budget wisely
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <Form {...form}>
                    <form onSubmit={onSubmit("login")} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username or Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your username or email"
                                {...field}
                                className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full backdrop-blur-md bg-white/10 hover:bg-primary/20 text-black hover:text-black border-2 border-black dark:border-white dark:hover:bg-gray-800/50 rounded-full transition-all duration-300"
                        disabled={loginMutation.isPending}
                      >
                        Login
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                <TabsContent value="register">
                  <Form {...form}>
                    <form onSubmit={onSubmit("register")} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username or Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your username or email"
                                {...field}
                                className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full backdrop-blur-md bg-white/10 hover:bg-primary/20 text-black hover:text-black border-2 border-black dark:border-white dark:hover:bg-gray-800/50 rounded-full transition-all duration-300"
                        disabled={registerMutation.isPending}
                      >
                        Register
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:flex flex-1 items-center justify-center p-8 backdrop-blur-lg bg-primary/5">
          <div className="max-w-md space-y-6 text-center">
            <ChartPieIcon className="mx-auto h-24 w-24 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Take Control of Your Finances
            </h1>
            <p className="text-lg text-muted-foreground">
              AI Personal Finance Coach helps you track expenses, set budgets, and achieve your financial goals with powerful analytics and insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}