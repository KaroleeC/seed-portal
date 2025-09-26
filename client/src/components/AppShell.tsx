import * as React from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  /** e.g. "max-w-5xl" | "max-w-7xl" */
  maxWidthClassName?: string;
  /** Additional classes on the root wrapper */
  className?: string;
  /** Additional classes on the content container */
  contentClassName?: string;
}

/**
 * AppShell provides a consistent page scaffold:
 * - background layer (uses brand gradient currently)
 * - header (defaults to UniversalNavbar)
 * - optional fixed sidebar slot
 * - standardized content container spacing
 */
export function AppShell({
  children,
  sidebar,
  header,
  maxWidthClassName = "max-w-7xl",
  className,
  contentClassName,
}: AppShellProps) {
  // When a sidebar is present, we reserve space and render a flex layout.
  const hasSidebar = !!sidebar;

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]",
        className,
      )}
    >
      {/* Header */}
      {header ?? <UniversalNavbar />}

      {/* Main area */}
      <div className={cn(hasSidebar && "flex")}>
        {hasSidebar && <aside className="shrink-0">{sidebar}</aside>}
        <main
          className={cn(hasSidebar ? "flex-1" : undefined, "px-6 py-8 w-full")}
        >
          <div className={cn("mx-auto", maxWidthClassName, contentClassName)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
