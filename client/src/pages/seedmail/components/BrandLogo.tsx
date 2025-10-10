import React from "react";
import { useTheme } from "@/theme";
import { appLogoUrlForTheme } from "@/lib/brandAssets";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  app: string;
  className?: string;
  fallbackText?: string;
}

export function BrandLogo({ app, className, fallbackText }: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const src = appLogoUrlForTheme(app, resolvedTheme);

  if (!src) {
    return (
      <span className={cn("font-bold text-lg text-foreground", className)}>
        {fallbackText || app}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={fallbackText || app}
      className={cn("block select-none", className)}
      draggable={false}
    />
  );
}
