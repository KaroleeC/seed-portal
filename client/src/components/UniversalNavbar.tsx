import React, { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Bell,
  User,
  Settings,
  LogOut,
  Shield,
  UserMinus,
} from "lucide-react";
import { PERMISSIONS, hasPermission } from "@shared/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BackButton } from "@/components/BackButton";
import { useBackNavigation } from "@/hooks/use-navigation-history";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { logoLight as logoLightData, logoDark as logoDarkData } from "@/assets/logos";
import { useTheme } from "@/theme";
import { ThemeToggle } from "@/components/ThemeToggle";

interface UniversalNavbarProps {
  showBackButton?: boolean;
  fallbackPath?: string;
}

export function UniversalNavbar({
  showBackButton = true,
  fallbackPath = "/",
}: UniversalNavbarProps) {
  const { user: dbUser, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { canGoBack } = useBackNavigation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Avatar content (profile photo or initial)
  const avatarContent = useMemo(() => {
    if (dbUser?.profilePhoto) {
      return (
        <img
          src={dbUser.profilePhoto}
          alt="Profile"
          className="w-7 h-7 rounded-full object-cover border border-white/20"
        />
      );
    }
    const initial =
      dbUser?.firstName?.charAt(0)?.toUpperCase() ||
      dbUser?.email?.charAt(0)?.toUpperCase() ||
      "?";
    return (
      <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
        {initial}
      </div>
    );
  }, [dbUser?.profilePhoto, dbUser?.firstName, dbUser?.email]);

  // Basic user display info
  const userInfo = useMemo(
    () => ({
      displayName: dbUser?.email?.split("@")[0] || "",
      email: dbUser?.email || "",
      isImpersonating: dbUser?.isImpersonating || false,
    }),
    [dbUser?.email, dbUser?.isImpersonating],
  );

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // Stop impersonation mutation
  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/stop-impersonation", {});
    },
    onSuccess: async () => {
      toast({
        title: "Impersonation Stopped",
        description: "You have returned to your admin account.",
      });
      setLocation("/admin");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop impersonation",
        variant: "destructive",
      });
    },
  });

  const handleStopImpersonation = useCallback(() => {
    stopImpersonationMutation.mutate();
  }, [stopImpersonationMutation]);

  // Determine back button and fallback path
  const mainDashboardRoutes = [
    "/",
    "/admin",
    "/sales-dashboard",
    "/service-dashboard",
  ];
  const isMainDashboard = mainDashboardRoutes.includes(location as unknown as string);
  const shouldShowBackButton = showBackButton && canGoBack && !isMainDashboard;

  const computedFallbackPath = useMemo(() => {
    const defaultDash = dbUser?.defaultDashboard;
    if (defaultDash === "admin") return "/admin";
    if (defaultDash === "sales") return "/sales-dashboard";
    if (defaultDash === "service") return "/service-dashboard";
    if (dbUser?.role === "admin") return "/admin";
    return "/";
  }, [dbUser?.defaultDashboard, dbUser?.role]);

  const finalFallbackPath = fallbackPath || computedFallbackPath;

  // Use embedded data URIs for logos (no external assets)
  const logoSrc = resolvedTheme === "dark" ? logoDarkData : logoLightData;

  // SeedQC (Calculator) Settings access
  const onCalculatorRoute =
    String(location).startsWith("/calculator") ||
    String(location).startsWith("/apps/seedqc");
  const canManageSeedQC = dbUser?.role
    ? hasPermission(dbUser.role as any, PERMISSIONS.MANAGE_PRICING)
    : false;
  const showSeedQcSettings = onCalculatorRoute && canManageSeedQC;
  const goToSeedQcSettings = useCallback(() => {
    setLocation("/apps/seedqc/settings");
  }, []);

  // SeedPay (Commission Tracker) Settings access
  const onCommissionRoute =
    String(location).startsWith("/commission-tracker") ||
    String(location).startsWith("/apps/seedpay");
  const canManageSeedPay = dbUser?.role
    ? hasPermission(dbUser.role as any, PERMISSIONS.MANAGE_COMMISSIONS)
    : false;
  const showSeedPaySettings = onCommissionRoute && canManageSeedPay;
  const goToSeedPaySettings = useCallback(() => {
    setLocation("/apps/seedpay/settings");
  }, []);

  // Global settings hub navigation
  const handleGoToSettings = useCallback(() => {
    setLocation("/settings");
  }, []);

  // Simple nav handlers
  const handleGoToProfile = useCallback(() => {
    setLocation("/profile");
  }, []);
  const handleGoToKbAdmin = useCallback(() => {
    setLocation("/kb-admin");
  }, []);
  const handleGoToAdmin = useCallback(() => {
    setLocation("/admin");
  }, []);

  return (
    <header className="bg-transparent z-50 py-4 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-center h-20">
          <img src={logoSrc} alt="Seed Financial" className="h-16" />
        </div>

        {/* Smart Back Button - Positioned Absolutely */}
        {shouldShowBackButton && (
          <div className="absolute top-4 left-6">
            <BackButton
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              fallbackPath={finalFallbackPath}
            />
          </div>
        )}

        {/* User Menu - Positioned Absolutely */}
        <div className="absolute top-4 right-6 flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-white/10 text-white"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-orange-500 rounded-full" />
          </Button>
          {showSeedPaySettings && (
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 hover:bg-white/10 text-white"
              onClick={goToSeedPaySettings}
              aria-label="Commission Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {showSeedQcSettings && (
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 hover:bg-white/10 text-white"
              onClick={goToSeedQcSettings}
              aria-label="Calculator Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <ThemeToggle className="text-white" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 p-2 hover:bg-white/10 text-white"
              >
                {avatarContent}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-gray-900 text-sm">
                  {userInfo.displayName}
                </p>
                <p className="text-xs text-gray-500">{userInfo.email}</p>
                {userInfo.isImpersonating && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <p className="text-xs text-orange-600 font-medium">
                      Admin View
                    </p>
                  </div>
                )}
              </div>
              <DropdownMenuItem
                onClick={handleGoToSettings}
                className="text-sm"
              >
                <Settings className="mr-2 h-3 w-3" />
                Settings
              </DropdownMenuItem>
              {userInfo.isImpersonating && (
                <DropdownMenuItem
                  onClick={handleStopImpersonation}
                  className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  disabled={stopImpersonationMutation.isPending}
                >
                  <UserMinus className="mr-2 h-3 w-3" />
                  {stopImpersonationMutation.isPending
                    ? "Stopping..."
                    : "Stop Impersonation"}
                </DropdownMenuItem>
              )}
              {userInfo.isImpersonating && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={handleGoToProfile} className="text-sm">
                <User className="mr-2 h-3 w-3" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGoToKbAdmin} className="text-sm">
                <Settings className="mr-2 h-3 w-3" />
                Knowledge Base Admin
              </DropdownMenuItem>
              {(userInfo.email === "jon@seedfinancial.io" ||
                userInfo.email === "anthony@seedfinancial.io" ||
                dbUser?.role === "admin") && (
                <DropdownMenuItem onClick={handleGoToAdmin} className="text-sm">
                  <Shield className="mr-2 h-3 w-3" />
                  SEEDOS Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 text-sm"
              >
                <LogOut className="mr-2 h-3 w-3" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
