import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  overlay?: boolean;
  overflowVisible?: boolean;
  /** Show the top-right corner accent overlay */
  cornerAccent?: boolean;
}

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  (
    { className, overlay = true, overflowVisible = false, cornerAccent = true, children, ...props },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        className={cn(
          // Tokenized base + neutral DS utilities
          "relative group bg-card text-card-foreground border border-border surface-glass",
          overflowVisible ? "overflow-visible" : "overflow-hidden",
          // Shared motion utility
          "surface-motion",
          className
        )}
        {...props}
      >
        {overlay && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}
        {/* Optional corner accent to match KB tiles */}
        {cornerAccent && (
          <div className="pointer-events-none absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-3xl" />
        )}
        {/* Content container fills card height to support absolute-positioned children */}
        <div className="relative h-full">{children}</div>
      </Card>
    );
  }
);
SurfaceCard.displayName = "SurfaceCard";
