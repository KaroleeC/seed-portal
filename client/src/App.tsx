import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { NavigationHistoryProvider } from "@/hooks/use-navigation-history";
import { ProtectedRoute } from "@/lib/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import NotFound from "@/pages/not-found";
import Calculator from "@/pages/home"; // Quote Calculator component
import AuthPage from "@/pages/auth-page";
import LoginPage from "@/pages/login";
import SalesDashboard from "@/pages/sales-dashboard"; // Sales dashboard
import AdminDashboard from "@/pages/admin-dashboard"; // Admin dashboard
import AdminHubspotPage from "@/pages/admin-hubspot"; // Admin HubSpot Diagnostics
import RBACManagement from "@/pages/rbac-management"; // RBAC & Policy Management
import ServiceDashboard from "@/pages/service-dashboard"; // Service dashboard
import CommissionTracker from "@/pages/commission-tracker";
import AdminCommissionTracker from "@/pages/admin-commission-tracker";
import SalesCommissionTracker from "@/pages/sales-commission-tracker";
import ClientIntel from "@/pages/client-intel";
import ClientProfilesPage from "@/pages/client-profiles";
import LeadsInboxPage from "@/pages/leads-inbox";
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
// import AdminCalculatorSettings from "@/pages/admin-calculator-settings";
import SettingsMock from "@/pages/settings-mock";
import SettingsHubV2 from "@/pages/settings-hub-v2";
import SchedulerAppPage from "@/pages/scheduler-app";
import PublicSchedulerPage from "@/pages/public-scheduler";
import SalesCadenceListPage from "@/pages/sales-cadence";
import SalesCadenceBuilderPage from "@/pages/sales-cadence/builder/[id]";
import SeedMailPage from "@/pages/seedmail";
import SeedMailSettings from "@/pages/apps/seedmail/settings";
// import SeedPaySettings from "@/pages/seedpay-settings";
import AssistantPage from "@/pages/assistant";
import CommandDockSettings from "@/pages/command-dock-settings";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { Loader2 } from "lucide-react";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import { CommandDock } from "@/components/command/CommandDock";

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
        {/* Wrap heavy dashboards in per-page boundaries to avoid global overlay */}
        <ProtectedRoute
          path="/"
          component={() => (
            <ErrorBoundary>
              <SalesDashboard />
            </ErrorBoundary>
          )}
        />
        <ProtectedRoute
          path="/admin"
          component={() => (
            <ErrorBoundary>
              <AdminDashboard />
            </ErrorBoundary>
          )}
        />
        <ProtectedRoute
          path="/sales-dashboard"
          component={() => (
            <ErrorBoundary>
              <SalesDashboard />
            </ErrorBoundary>
          )}
        />
        <ProtectedRoute
          path="/service-dashboard"
          component={() => (
            <ErrorBoundary>
              <ServiceDashboard />
            </ErrorBoundary>
          )}
        />
        <ProtectedRoute
          path="/admin/hubspot"
          component={() => (
            <ErrorBoundary>
              <AdminHubspotPage />
            </ErrorBoundary>
          )}
        />
        {/* Legacy route -> new app namespace */}
        <ProtectedRoute path="/calculator" component={() => <Redirect to="/apps/seedqc" />} />
        <ProtectedRoute path="/apps/seedqc" component={Calculator} />
        <ProtectedRoute
          path="/apps/seedqc/settings"
          component={() => <Redirect to="/settings#seedqc" />}
        />
        <ProtectedRoute path="/apps/seedpay" component={CommissionTracker} />
        <ProtectedRoute
          path="/apps/seedpay/settings"
          component={() => <Redirect to="/settings#seedpay" />}
        />
        <ProtectedRoute path="/settings" component={SettingsHubV2} />
        <ProtectedRoute path="/settings/v2" component={() => <Redirect to="/settings" />} />
        <ProtectedRoute path="/settings/mock" component={SettingsMock} />
        <ProtectedRoute path="/settings/command-dock" component={CommandDockSettings} />
        {/* App-specific settings pages */}
        <ProtectedRoute path="/apps/seedmail/settings" component={SeedMailSettings} />
        {/* Scheduler app (internal) */}
        <ProtectedRoute path="/apps/scheduler" component={SchedulerAppPage} />
        {/* Sales Cadence (Phase A.1 UI) */}
        <ProtectedRoute path="/apps/sales-cadence" component={SalesCadenceListPage} />
        <ProtectedRoute
          path="/apps/sales-cadence/builder/:id"
          component={SalesCadenceBuilderPage}
        />
        {/* SeedMail - Email Client */}
        <ProtectedRoute path="/apps/seedmail" component={SeedMailPage} />
        {/* Consolidate Commission Tracker routes */}
        <ProtectedRoute
          path="/commission-tracker"
          component={() => <Redirect to="/apps/seedpay" />}
        />
        <ProtectedRoute
          path="/admin-commission-tracker"
          component={() => <Redirect to="/admin/commission-tracker" />}
        />
        <ProtectedRoute path="/admin/commission-tracker" component={AdminCommissionTracker} />
        <ProtectedRoute path="/sales-commission-tracker" component={SalesCommissionTracker} />
        <ProtectedRoute path="/client-intel" component={ClientIntel} />
        <ProtectedRoute path="/client-profiles" component={ClientProfilesPage} />
        <ProtectedRoute path="/leads-inbox" component={LeadsInboxPage} />
        <ProtectedRoute path="/leads" component={LeadsInboxPage} />
        <ProtectedRoute path="/knowledge-base" component={KnowledgeBase} />
        <ProtectedRoute path="/kb-admin" component={KbAdmin} />
        <ProtectedRoute path="/user-management" component={UserManagement} />
        <ProtectedRoute path="/admin/rbac" component={RBACManagement} />
        <ProtectedRoute path="/admin/pricing" component={AdminPricingPage} />
        {/* Consolidate legacy calculator admin routes under app settings */}
        <ProtectedRoute
          path="/admin/calculator-manager"
          component={() => <Redirect to="/apps/seedqc/settings" />}
        />
        <ProtectedRoute
          path="/admin/calculator-settings"
          component={() => <Redirect to="/apps/seedqc/settings" />}
        />
        <ProtectedRoute path="/cdn-monitoring" component={CDNMonitoring} />
        <ProtectedRoute path="/stripe-dashboard" component={StripeDashboard} />
        <ProtectedRoute path="/cdn-test" component={CDNTest} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/assistant" component={AssistantPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/request-access" component={RequestAccess} />
        {/* Public scheduler route (unauthenticated) */}
        <Route path="/schedule/:slug" component={PublicSchedulerPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

// Gate rendering until auth loading is resolved to avoid first-load flicker
function AuthGate() {
  const { isLoading, user, error } = useAuth();

  // Show loading spinner while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // If there's an auth error that's not a 401, show it
  if (error && !error.message.includes("401")) {
    console.error("[AuthGate] Auth error:", error);
  }

  return (
    <>
      <Router />
      {/* Global Assistant Widget (hidden on /auth and /request-access internally) */}
      <AssistantWidget />
      {/* Global Command Dock */}
      <CommandDock />
      {/* Global keyboard shortcuts (Cmd/Ctrl+K, Cmd/Ctrl+L) */}
      <GlobalShortcuts />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationHistoryProvider>
            <Toaster />
            <AuthGate />
          </NavigationHistoryProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
