import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackNavigation } from "@/hooks/use-navigation-history";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  variant?:
    | "default"
    | "ghost"
    | "outline"
    | "secondary"
    | "destructive"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  fallbackPath?: string; // Path to go to if no history available
  showText?: boolean;
  customText?: string;
}

export function BackButton({
  className,
  variant = "ghost",
  size = "default",
  fallbackPath = "/",
  showText = true,
  customText = "Back",
}: BackButtonProps) {
  const { goBack, canGoBack, previousPage } = useBackNavigation();

  const handleClick = () => {
    // Use navigation history if available, otherwise fallback to browser history
    if (canGoBack) {
      goBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else if (fallbackPath) {
      window.location.href = fallbackPath;
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("flex items-center gap-2", className)}
      title={previousPage ? `Back to ${getPageTitle(previousPage)}` : "Go back"}
    >
      <ArrowLeft className="h-4 w-4" />
      {showText && size !== "icon" && customText}
    </Button>
  );
}

// Helper function to get readable page titles from paths
function getPageTitle(path: string): string {
  const pathMap: Record<string, string> = {
    "/": "Dashboard",
    "/admin": "Admin Dashboard",
    "/sales-dashboard": "Sales Dashboard",
    "/service-dashboard": "Service Dashboard",
    "/calculator": "Quote Calculator",
    "/commission-tracker": "Commission Tracker",
    "/client-intel": "Client Intelligence",
    "/knowledge-base": "Knowledge Base",
    "/kb-admin": "KB Admin",
    "/user-management": "User Management",
    "/profile": "Profile",
    "/cdn-monitoring": "CDN Monitoring",
    "/stripe-dashboard": "Stripe Dashboard",
  };

  return (
    pathMap[path] ||
    path
      .replace("/", "")
      .replace("-", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

// Breadcrumb component that shows the navigation path
export function NavigationBreadcrumb({ className }: { className?: string }) {
  // The useBackNavigation hook doesn't expose history directly,
  // so we'll need to import and use useNavigationHistory for this component
  return null; // Temporarily disabled until we properly implement navigation history
}
