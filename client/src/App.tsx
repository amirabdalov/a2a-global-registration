import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pages
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/signup";
import LoginPage from "@/pages/login";
import ProfilePage from "@/pages/dashboard/profile";
import KycPage from "@/pages/dashboard/kyc";
import TasksPage from "@/pages/dashboard/tasks";
import MyTasksPage from "@/pages/dashboard/my-tasks";
import PaymentsPage from "@/pages/dashboard/payments";
import ReferralsPage from "@/pages/dashboard/referrals";
import SettingsPage from "@/pages/dashboard/settings";
import SupportPage from "@/pages/dashboard/support";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle" aria-label="Toggle theme" className="h-8 w-8">
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function DashboardLayout() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/dashboard/profile" component={ProfilePage} />
              <Route path="/dashboard/kyc" component={KycPage} />
              <Route path="/dashboard/tasks" component={TasksPage} />
              <Route path="/dashboard/my-tasks" component={MyTasksPage} />
              <Route path="/dashboard/payments" component={PaymentsPage} />
              <Route path="/dashboard/referrals" component={ReferralsPage} />
              <Route path="/dashboard/settings" component={SettingsPage} />
              <Route path="/dashboard/support" component={SupportPage} />
              <Route path="/dashboard">
                <Redirect to="/dashboard/profile" />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/auth/signup" />
      </Route>
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/dashboard/:rest*" component={DashboardLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
