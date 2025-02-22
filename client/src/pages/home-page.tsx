import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import {
  ChartPieIcon,
  ArrowRightIcon,
  ReceiptIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";

export default function HomePage() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const { theme, setTheme } = useTheme();

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300'>
      <header className='sticky top-0 z-50 backdrop-blur-lg bg-white/75 dark:bg-gray-900/75 border-b border-gray-200/50 dark:border-gray-700/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='h-16 flex items-center justify-between'>
            <div className="flex items-center space-x-4">
              <img src="/cp.jpg" alt="Company Logo" className="h-8 w-auto" />
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
                  <SunIcon className='h-5 w-5' />
                ) : (
                  <MoonIcon className='h-5 w-5' />
                )}
              </button>
              <p className='text-lg text-muted-foreground'>{greeting} ⛅</p>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <div className='text-center mb-16 space-y-6'>
          <h1 className='text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
            Welcome to AI Personal Finance Coach
          </h1>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Take control of your finances with our powerful budgeting tools and
            expense tracking features.
          </p>
          <Link href="/auth">
            <Button size="lg" className='mt-8 backdrop-blur-md bg-white/10 hover:bg-primary/20 text-black hover:text-black border-2 border-black dark:border-white dark:hover:bg-gray-800/50 rounded-full transition-all duration-300'>
              Get Started
              <ArrowRightIcon className='ml-2 h-4 w-4' />
            </Button>
          </Link>
        </div>

        <div className='grid md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
          <Card className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px] space-y-4'>
            <ChartPieIcon className='h-12 w-12 text-primary' />
            <h2 className='text-2xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
              Track Expenses
            </h2>
            <p className='text-muted-foreground'>
              Monitor your spending patterns with detailed charts and analytics.
            </p>
          </Card>

          <Card className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px] space-y-4'>
            <ReceiptIcon className='h-12 w-12 text-primary' />
            <h2 className='text-2xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
              Upload Receipts
            </h2>
            <p className='text-muted-foreground'>
              Use AI to analyze your receipt image and save the expense
              automatically.
            </p>
          </Card>

          <Card className='backdrop-blur-lg bg-white/40 dark:bg-gray-800/40 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] hover:translate-y-[-2px] space-y-4'>
            <BellIcon className='h-12 w-12 text-primary' />
            <h2 className='text-2xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
              Smart Suggestions
            </h2>
            <p className='text-muted-foreground'>
              AI analyzes your expenses and provides personalized recommendations
              to help you save more.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}