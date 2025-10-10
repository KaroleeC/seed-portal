import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

import {
  BarChart3,
  TrendingUp,
  Shield,
  Clock,
  Target,
  Activity,
  Video,
  Bot,
  Headphones,
  Users,
  Monitor,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard as CreditCardIcon,
  Banknote,
  Receipt,
} from "lucide-react";

import { SurfaceCard } from "@/components/ds/SurfaceCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardWelcome } from "@/components/layout/DashboardWelcome";
import { QuickAction } from "@/components/QuickAction";
import { apps } from "@/assets";

interface SystemHealth {
  crm: "healthy" | "unhealthy" | "error";
  storage: "healthy" | "unhealthy" | "error";
  ai: "healthy" | "unhealthy" | "error";
  weather: "healthy" | "unhealthy" | "error";
  geocoding: "healthy" | "unhealthy" | "error";
}

interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  services: {
    [key: string]: {
      status: "healthy" | "unhealthy";
      responseTime: number;
      message?: string;
    };
  };
}

// navigationItems removed (left nav deprecated)

export default function AdminDashboard() {
  // Real-time system health monitoring
  const { data: healthData, isLoading: healthLoading } = useQuery<HealthCheckResponse>({
    queryKey: ["/api/health"],
    refetchInterval: 60000, // Refresh every 60 seconds
    refetchIntervalInBackground: true,
  });

  const systemHealth: SystemHealth = {
    crm: healthData?.services.crm?.status || "error",
    storage: healthData?.services.storage?.status || "error",
    ai: healthData?.services.ai?.status || "error",
    weather: healthData?.services.weather?.status || "error",
    geocoding: healthData?.services.geocoding?.status || "error",
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getServiceDisplayName = (service: string) => {
    switch (service) {
      case "crm":
        return "HubSpot CRM";
      case "storage":
        return "Box Storage";
      case "ai":
        return "OpenAI";
      case "weather":
        return "Weather Service";
      case "geocoding":
        return "Geocoding";
      default:
        return service.charAt(0).toUpperCase() + service.slice(1);
    }
  };

  // Debug logging for admin check

  // Left navigation removed

  // Use PermissionGuard for proper admin access control
  return (
    <PermissionGuard
      permissions={PERMISSIONS.VIEW_ADMIN_DASHBOARD}
      fallback={
        <div className="min-h-screen theme-seed-dark flex items-center justify-center page-bg">
          <Card className="border shadow-xl max-w-md">
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-4">
                You need admin privileges to access SEEDOS.
              </p>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Back to Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <DashboardLayout maxWidthClassName="max-w-7xl">
        {/* Main Content Area */}
        <div>
          <DashboardWelcome />

          {/* Dashboard Content */}
          <div className="p-6 space-y-6">
            {/* Quick Actions (standardized) */}
            <div>
              <div className="grid gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 justify-items-center">
                <QuickAction
                  label="Sales Intel"
                  logoLightSrc={apps.salesiq.light}
                  logoDarkSrc={apps.salesiq.dark}
                  gradient="from-blue-500 to-blue-600"
                  hoverGradient="from-blue-400 to-blue-500"
                  delay={1}
                  href="/sales-dashboard"
                  useRim
                  accentClass="text-[#bf1b2c]"
                  watermarkIcon={<TrendingUp />}
                />
                <QuickAction
                  label="Service Intel"
                  logoLightSrc={apps.serviceiq.light}
                  logoDarkSrc={apps.serviceiq.dark}
                  gradient="from-indigo-500 to-indigo-600"
                  hoverGradient="from-indigo-400 to-indigo-500"
                  delay={2}
                  href="/service-dashboard"
                  useRim
                  accentClass="text-[#26a69a]"
                  watermarkIcon={<Headphones />}
                />
                <QuickAction
                  label="SeedKPI"
                  logoLightSrc={apps.seedkpi.light}
                  logoDarkSrc={apps.seedkpi.dark}
                  gradient="from-amber-500 to-amber-600"
                  hoverGradient="from-amber-400 to-amber-500"
                  delay={3}
                  href="/admin"
                  useRim
                  accentClass="text-[#e2bd00]"
                  watermarkIcon={<Target />}
                />
                <QuickAction
                  label="AI Workspace"
                  logoLightSrc={apps.seedai.light}
                  logoDarkSrc={apps.seedai.dark}
                  gradient="from-purple-500 to-purple-600"
                  hoverGradient="from-purple-400 to-purple-500"
                  delay={4}
                  href="/assistant"
                  useRim
                  accentClass="text-[#6a1b9a]"
                  watermarkIcon={<Bot />}
                />
                <QuickAction
                  label="SeedPay"
                  logoLightSrc={apps.seedpay.light}
                  logoDarkSrc={apps.seedpay.dark}
                  gradient="from-emerald-500 to-emerald-600"
                  hoverGradient="from-emerald-400 to-emerald-500"
                  delay={5}
                  href="/apps/seedpay"
                  useRim
                  accentClass="text-[#118c4f]"
                  watermarkIcon={<CreditCardIcon />}
                />
              </div>
            </div>
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-4 gap-6">
              <SurfaceCard className="col-span-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Total Revenue</p>
                      <p className="text-3xl font-bold text-foreground">$425K</p>
                      <p className="text-muted-foreground text-sm">+12% from last month</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>

              <SurfaceCard className="col-span-1 border shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Active Clients
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Active Clients</p>
                      <p className="text-3xl font-bold text-foreground">89</p>
                      <p className="text-muted-foreground text-sm">+5 new this month</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>

              <SurfaceCard className="col-span-1 border shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Pipeline Value</p>
                      <p className="text-3xl font-bold text-foreground">$127K</p>
                      <p className="text-muted-foreground text-sm">18 active deals</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>

              <SurfaceCard className="col-span-1 border shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">System Health</p>
                      <p className="text-3xl font-bold text-foreground">98%</p>
                      <p className="text-muted-foreground text-sm">All systems operational</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Shield className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <SurfaceCard className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <span>Revenue Analytics</span>
                    <Badge variant="secondary" className="bg-orange-500 text-white">
                      Current Week
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                      <p className="font-medium">Revenue Chart Integration</p>
                      <p className="text-sm">Connect to Stripe/Mercury for live data</p>
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>

              {/* System Status */}
              <SurfaceCard>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      System Status
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Updates every 60s</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {healthLoading ? (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                        <span className="font-medium text-muted-foreground">
                          Loading system status...
                        </span>
                      </div>
                    ) : (
                      Object.entries(systemHealth).map(([service, status]) => (
                        <div
                          key={service}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(status)}
                            <span className="font-medium text-foreground">
                              {getServiceDisplayName(service)}
                            </span>
                          </div>
                          <Badge
                            variant={status === "healthy" ? "default" : "destructive"}
                            className={
                              status === "healthy"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }
                          >
                            {status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </SurfaceCard>
            </div>

            {/* Integration Status Grid */}
            <div className="grid grid-cols-4 gap-6">
              <SurfaceCard
                className="hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  window.location.href = "/stripe-dashboard";
                }}
              >
                <CardContent className="p-6 text-center">
                  <CreditCardIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-foreground">Stripe</h3>
                  <p className="text-sm text-muted-foreground mb-3">Payment processing</p>
                  <Badge className="bg-green-500 text-white">Connected</Badge>
                </CardContent>
              </SurfaceCard>

              <SurfaceCard className="hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <Banknote className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-foreground">Mercury</h3>
                  <p className="text-sm text-muted-foreground mb-3">Business banking</p>
                  <Badge variant="secondary">Setup Required</Badge>
                </CardContent>
              </SurfaceCard>

              <SurfaceCard className="hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <Receipt className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-foreground">QuickBooks</h3>
                  <p className="text-sm text-muted-foreground mb-3">Accounting sync</p>
                  <Badge variant="secondary">Setup Required</Badge>
                </CardContent>
              </SurfaceCard>

              <SurfaceCard className="hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <Video className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-foreground">Zoom</h3>
                  <p className="text-sm text-muted-foreground mb-3">Meeting analytics</p>
                  <Badge variant="secondary">Setup Required</Badge>
                </CardContent>
              </SurfaceCard>
            </div>

            {/* Recent Activity & Alerts */}
            <div className="grid grid-cols-2 gap-6">
              <SurfaceCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-foreground">New client onboarded</p>
                        <p className="text-sm text-muted-foreground">
                          TechFlow Solutions - $12,000 ARR
                        </p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-foreground">Commission approved</p>
                        <p className="text-sm text-muted-foreground">Amanda Rodriguez - $450</p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-foreground">System backup completed</p>
                        <p className="text-sm text-muted-foreground">All data synchronized</p>
                        <p className="text-xs text-muted-foreground">6 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>
              <SurfaceCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Bell className="h-5 w-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted border rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">ClickUp Integration Warning</p>
                        <p className="text-sm text-muted-foreground">API rate limit approaching</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted border rounded-lg">
                      <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Scheduled Maintenance</p>
                        <p className="text-sm text-muted-foreground">Database backup in 2 hours</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Security Scan Complete</p>
                        <p className="text-sm text-muted-foreground">No vulnerabilities detected</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
