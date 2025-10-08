import React, { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { BackButton } from "@/components/BackButton";
import { useBackNavigation } from "@/hooks/use-navigation-history";
import { brand, seedos, apps, getThemedLogo } from "@/assets";
import { useTheme } from "@/theme";
// Top-right controls removed; theme toggle will live in Command Dock

interface UniversalNavbarProps {
  showBackButton?: boolean;
  fallbackPath?: string;
}

export function UniversalNavbar({
  showBackButton = true,
  fallbackPath = "/",
}: UniversalNavbarProps) {
  const { user: dbUser } = useAuth();
  const [location] = useLocation();
  const { canGoBack } = useBackNavigation();
  const { resolvedTheme } = useTheme();

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

  // Pick SEEDOS per-dashboard logos when on a main dashboard; otherwise swap to per-app logos
  const path = String(location);
  const isAdmin = path.startsWith("/admin");
  const isService = path.startsWith("/service-dashboard");
  const isSales = path.startsWith("/sales-dashboard") || path === "/";
  const isAssistant = path.startsWith("/assistant");
  const isClientIQ = path.startsWith("/client-profiles") || path.startsWith("/client-intel");
  const appMatch = path.match(/^\/apps\/([^/]+)/);
  const appName = appMatch?.[1];
  
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const logoFallback = brand.darkFallback;
  let logoSrc = getThemedLogo(brand, theme);
  let logoAlt = "Seed Financial";
  
  if (isAdmin) {
    logoSrc = getThemedLogo(seedos.admin, theme);
    logoAlt = "SEEDOS Admin";
  } else if (isService) {
    logoSrc = getThemedLogo(seedos.service, theme);
    logoAlt = "SEEDOS Service";
  } else if (isSales) {
    logoSrc = getThemedLogo(seedos.sales, theme);
    logoAlt = "SEEDOS Sales";
  } else if (isAssistant) {
    logoSrc = getThemedLogo(apps.seedai, theme);
    logoAlt = "SeedAI";
  } else if (isClientIQ) {
    logoSrc = getThemedLogo(apps.clientiq, theme);
    logoAlt = "ClientIQ";
  } else if (appName === "seedqc") {
    logoSrc = getThemedLogo(apps.seedqc, theme);
    logoAlt = "SeedQC";
  } else if (appName === "seedpay") {
    logoSrc = getThemedLogo(apps.seedpay, theme);
    logoAlt = "SeedPay";
  }

  // Use a slightly smaller logo on app pages so it's not massive
  const isAppContext = Boolean(isAssistant || isClientIQ || appName);
  const sizeClass = isAppContext ? "h-16 sm:h-20 md:h-24 lg:h-28" : "h-20 sm:h-28 md:h-36 lg:h-48";

  // Top-right controls removed; notifications/theme/profile will live in Command Dock

  return (
    <header className="bg-transparent z-50 py-4 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-center py-2 sm:py-3 md:py-4 lg:py-4">
          <img
            src={logoSrc}
            onError={(e) => {
              if (e.currentTarget.src !== logoFallback) {
                e.currentTarget.src = logoFallback;
              }
            }}
            alt={logoAlt}
            className={sizeClass}
          />
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

        {/* Right-side controls removed; replaced by Command Dock entries */}
      </div>
    </header>
  );
}
