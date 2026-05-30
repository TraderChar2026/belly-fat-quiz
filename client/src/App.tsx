import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import DashboardSubmissions from "./pages/DashboardSubmissions";
import DashboardSales from "./pages/DashboardSales";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardOrderClickers from "./pages/DashboardOrderClickers";
import DashboardFunnel from "./pages/DashboardFunnel";
import DashboardEmailStats from "./pages/DashboardEmailStats";
import DashboardAdPerformance from "./pages/DashboardAdPerformance";
import DashboardVSLPerformance from "./pages/DashboardVSLPerformance";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={DashboardFunnel} />
      <Route path={"/dashboard/submissions"} component={DashboardSubmissions} />
      <Route path={"/dashboard/sales"} component={DashboardSales} />
      <Route path={"/dashboard/order-clickers"} component={DashboardOrderClickers} />
      <Route path={"/dashboard/analytics"} component={DashboardAdPerformance} />
      <Route path={"/dashboard/email-stats"} component={DashboardEmailStats} />
      <Route path={"/dashboard/vsl"} component={DashboardVSLPerformance} />
      <Route path={"/dashboard/questions"} component={DashboardAnalytics} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
