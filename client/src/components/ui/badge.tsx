import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        "seed-orange":
          "border-transparent bg-gradient-to-br from-[#d44400] via-[#e24c00] to-[#ff7f3f] text-white hover:brightness-110 transition-all",
        secondary:
          "border-transparent bg-gradient-to-br from-[color:var(--seed-dark)] to-[color:var(--seed-light)] text-white dark:from-[color:var(--seed-light)] dark:to-[color:var(--seed-dark)] hover:brightness-110 transition-all",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "seed-orange",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
