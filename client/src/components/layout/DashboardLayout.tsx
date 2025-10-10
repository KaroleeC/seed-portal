import * as React from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  quickActions?: React.ReactNode;
  aside?: React.ReactNode;
  /** e.g. "max-w-5xl" | "max-w-7xl" */
  maxWidthClassName?: string;
  /** Additional classes on the root wrapper */
  className?: string;
  /** Additional classes on the content container */
  contentClassName?: string;
  /** Show a Light preview toggle like SettingsLayout */
  showThemeToggle?: boolean;
}

/**
 * DashboardLayout provides a universal dashboard shell:
 * - universal page background via .page-bg (uses brand tokens)
 * - header (defaults to UniversalNavbar)
 * - optional quick actions band (slot)
 * - optional aside (transitional sidebar)
 * - standardized content container spacing
 */
export function DashboardLayout({
  children,
  header,
  quickActions,
  aside,
  maxWidthClassName = "max-w-5xl",
  className,
  contentClassName,
  showThemeToggle = false,
}: DashboardLayoutProps) {
  const hasAside = !!aside;
  const [previewLight, setPreviewLight] = React.useState(false);

  // When previewing light, strip any explicit theme-dark class passed in
  const sanitizedClassName = React.useMemo(() => {
    if (!previewLight || !className) return className;
    return className
      .split(" ")
      .filter((c) => c.trim() && c !== "theme-seed-dark" && c !== "theme-seedkb")
      .join(" ");
  }, [previewLight, className]);

  return (
    <div
      className={cn(
        "min-h-screen h-screen page-bg",
        !previewLight && "theme-seed-dark",
        sanitizedClassName
      )}
      data-theme={previewLight ? "light" : undefined}
    >
      {header ?? <UniversalNavbar />}

      {/* Main area */}
      <div className={cn("h-full", hasAside && "flex")}>
        {hasAside && <aside className="shrink-0">{aside}</aside>}
        <main className={cn("h-full", hasAside ? "flex-1 flex" : "flex")}>
          {showThemeToggle && (
            <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-end text-white/80">
              <span className="text-sm mr-2">Light preview</span>
              <Switch checked={previewLight} onCheckedChange={setPreviewLight} />
            </div>
          )}
          {/* Quick Actions row (optional) */}
          {quickActions}

          <div
            className={cn("mx-auto w-full px-6 pt-4 pb-12", maxWidthClassName, contentClassName)}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
