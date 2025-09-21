import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/use-auth";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { NavigationHistoryProvider } from "@/hooks/use-navigation-history";
import { ProtectedRoute } from "@/lib/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import NotFound from "@/pages/not-found";
import Calculator from "@/pages/home.tsx"; // Quote Calculator component  
import AuthPage from "@/pages/auth-page";
import SalesDashboard from "@/pages/sales-dashboard"; // Sales dashboard
import AdminDashboard from "@/pages/admin-dashboard"; // Admin dashboard
import AdminHubspotPage from "@/pages/admin-hubspot"; // Admin HubSpot Diagnostics
import ServiceDashboard from "@/pages/service-dashboard"; // Service dashboard
import CommissionTracker from "@/pages/commission-tracker";
import AdminCommissionTracker from "@/pages/admin-commission-tracker";
import SalesCommissionTracker from "@/pages/sales-commission-tracker";
import ClientIntel from "@/pages/client-intel";
import Profile from "@/pages/profile";
import KnowledgeBase from "@/pages/knowledge-base";
import KbAdmin from "@/pages/kb-admin";
import UserManagement from "@/pages/user-management";
import RequestAccess from "@/pages/request-access";
import CDNMonitoring from "@/pages/CDNMonitoring";
import CDNTest from "@/pages/CDNTest";
import StripeDashboard from "@/pages/stripe-dashboard";
import AdminPricingPage from "@/pages/admin-pricing";
import AdminCalculatorManager from "@/pages/admin-calculator-manager";
import AdminCalculatorSettings from "@/pages/admin-calculator-settings";
import SettingsHub from "@/pages/settings-hub";
import SeedPaySettings from "@/pages/seedpay-settings";

// Simple redirect helper for client-side path consolidation
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function Router() {
  // Automatically scroll to top when route changes
  useScrollToTop();

  return (
    <ErrorBoundary>
      <RoleBasedRedirect />
      <Switch>
        <ProtectedRoute path="/" component={SalesDashboard} />
        <ProtectedRoute path="/admin" component={AdminDashboard} />
        <ProtectedRoute path="/sales-dashboard" component={SalesDashboard} />
        <ProtectedRoute path="/service-dashboard" component={ServiceDashboard} />
        <ProtectedRoute path="/admin/hubspot" component={AdminHubspotPage} />
        {/* Legacy route -> new app namespace */}
        <ProtectedRoute path="/calculator" component={() => <Redirect to="/apps/seedqc" />} />
        <ProtectedRoute path="/apps/seedqc" component={Calculator} />
        <ProtectedRoute path="/apps/seedqc/settings" component={AdminCalculatorSettings} />
        <ProtectedRoute path="/apps/seedpay" component={CommissionTracker} />
        <ProtectedRoute path="/apps/seedpay/settings" component={SeedPaySettings} />
        <ProtectedRoute path="/settings" component={SettingsHub} />
        {/* Consolidate Commission Tracker routes */}
        <ProtectedRoute path="/commission-tracker" component={() => <Redirect to="/apps/seedpay" />} />
        <ProtectedRoute path="/admin-commission-tracker" component={() => <Redirect to="/admin/commission-tracker" />} />
        <ProtectedRoute path="/admin/commission-tracker" component={AdminCommissionTracker} />
        <ProtectedRoute path="/sales-commission-tracker" component={SalesCommissionTracker} />
        <ProtectedRoute path="/client-intel" component={ClientIntel} />
        <ProtectedRoute path="/knowledge-base" component={KnowledgeBase} />
        <ProtectedRoute path="/kb-admin" component={KbAdmin} />
        <ProtectedRoute path="/user-management" component={UserManagement} />
        <ProtectedRoute path="/admin/pricing" component={AdminPricingPage} />
        {/* Consolidate legacy calculator admin routes under app settings */}
        <ProtectedRoute path="/admin/calculator-manager" component={() => <Redirect to="/apps/seedqc/settings" />} />
        <ProtectedRoute path="/admin/calculator-settings" component={() => <Redirect to="/apps/seedqc/settings" />} />
        <ProtectedRoute path="/cdn-monitoring" component={CDNMonitoring} />
        <ProtectedRoute path="/stripe-dashboard" component={StripeDashboard} />
        <ProtectedRoute path="/cdn-test" component={CDNTest} />
        <ProtectedRoute path="/profile" component={Profile} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/request-access" component={RequestAccess} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationHistoryProvider>
            <Toaster />
            <Router />
          </NavigationHistoryProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
