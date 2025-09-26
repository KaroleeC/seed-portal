import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KbCardProps extends React.HTMLAttributes<HTMLDivElement> {
  overlay?: boolean;
  overflowVisible?: boolean;
}

export const KbCard = React.forwardRef<HTMLDivElement, KbCardProps>(
  (
    { className, overlay = true, overflowVisible = false, children, ...props },
    ref,
  ) => {
    return (
      <Card
        ref={ref}
        className={cn(
          // Exact surface pulled from Knowledge Base category tiles
          "relative group bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-slate-600/50 rounded-2xl backdrop-blur-xl",
          overflowVisible ? "overflow-visible" : "overflow-hidden",
          // Unified motion utility
          "kb-hover-motion",
          "hover:from-slate-700/90 hover:to-slate-800/90 hover:border-orange-400/70 hover:shadow-2xl hover:shadow-black/40",
          className,
        )}
        {...props}
      >
        {overlay && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}
        {/* Optional corner accent to match KB tiles */}
        {overlay && (
          <div className="pointer-events-none absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-3xl" />
        )}
        {/* Content container should be positioned relative above overlays */}
        <div className="relative">{children}</div>
      </Card>
    );
  },
);
KbCard.displayName = "KbCard";
