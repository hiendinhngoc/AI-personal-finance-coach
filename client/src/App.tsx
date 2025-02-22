import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import Dashboard from "@/pages/dashboard";
import TestAI from "@/pages/test-ai";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth } from "./hooks/use-auth";
import { Redirect } from "wouter";
import { ChatBot } from "@/components/ChatBot";

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  return user ? <Redirect to="/dashboard" /> : <HomePage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={RootRedirect} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/test-ai" component={TestAI} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <ChatBot />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;