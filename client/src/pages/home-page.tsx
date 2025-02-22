import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartPieIcon, ArrowRightIcon, ReceiptIcon, BellIcon } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-16">
          <Link href="/">
            <img src="/cp.jpg" alt="Company Logo" className="h-12 w-auto cursor-pointer" />
          </Link>
          <div className="text-right">
            <p className="text-lg text-muted-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},
              guest ⛅
            </p>
          </div>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">
            Welcome to Smart Budget
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Take control of your finances with our powerful budgeting tools and expense tracking features.
          </p>
          <Link href="/auth">
            <Button size="lg" className="mt-8">
              Login
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-6 space-y-4">
            <ChartPieIcon className="h-12 w-12 text-primary" />
            <h2 className="text-2xl font-semibold">Track Expenses</h2>
            <p className="text-muted-foreground">
              Monitor your spending patterns with detailed charts and analytics.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <ReceiptIcon className="h-12 w-12 text-primary" />
            <h2 className="text-2xl font-semibold">Upload Receipts</h2>
            <p className="text-muted-foreground">
              Keep your receipts organized by uploading them directly to the app.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <BellIcon className="h-12 w-12 text-primary" />
            <h2 className="text-2xl font-semibold">Smart Alerts</h2>
            <p className="text-muted-foreground">
              Get notified when you're approaching your budget limits.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}