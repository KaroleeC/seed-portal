import React from "react";
import { Link } from "wouter";
import { SurfaceCard } from "@/components/ds/SurfaceCard";
import { useTheme } from "@/theme";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon?: React.ReactNode;
  /** e.g. "from-indigo-500 to-indigo-600" */
  gradient: string;
  /** e.g. "from-indigo-400 to-indigo-500" */
  hoverGradient?: string;
  /** 1..N for staggered animation; maps to CSS var --delay */
  delay?: number;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  /** Optional themed logos, if provided will be used instead of icon */
  logoLightSrc?: string;
  logoDarkSrc?: string;
  /** Option C: Enable gradient rim ring */
  useRim?: boolean;
  /** Tailwind text-* class to set currentColor for ring/watermark, e.g. 'text-orange-400' */
  accentClass?: string;
  /** Subtle watermark glyph behind the logo (Lucide icon element). Size/opacity will be applied. */
  watermarkIcon?: React.ReactElement;
};

export function QuickAction({
  label,
  icon,
  gradient,
  hoverGradient,
  delay = 1,
  href,
  onClick,
  ariaLabel,
  logoLightSrc,
  logoDarkSrc,
  useRim = false,
  accentClass,
  watermarkIcon,
}: Props) {
  const { resolvedTheme } = useTheme();
  let logoSrc: string | undefined = undefined;
  if (logoLightSrc && logoDarkSrc) {
    logoSrc = resolvedTheme === "dark" ? logoDarkSrc : logoLightSrc;
  }
  const iconNode = logoSrc ? (
    <img src={logoSrc} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
  ) : (
    icon
  );
  let watermarkNode: React.ReactNode = null;
  if (React.isValidElement(watermarkIcon)) {
    const wmEl = watermarkIcon as React.ReactElement<{ className?: string }>;
    watermarkNode = React.cloneElement(wmEl, {
      className: cn(wmEl.props?.className, "w-[68%] h-[68%] opacity-[0.08]"),
    });
  }

  const content = (
    <SurfaceCard
      className="w-[9.2rem] h-[9.2rem] rounded-full cursor-pointer action-card-bounce"
      style={{ ["--delay"]: delay } as React.CSSProperties}
      cornerAccent={false}
    >
      {/* Watermark layer (behind) */}
      {watermarkNode && (
        <div
          className={cn(
            "absolute inset-0 z-0 flex items-center justify-center pointer-events-none",
            accentClass
          )}
        >
          {watermarkNode}
        </div>
      )}
      {/* Gradient rim ring layer (middle) */}
      {useRim && (
        <div
          aria-hidden
          className={cn("absolute inset-0 z-10 rounded-full pointer-events-none", accentClass)}
          style={{
            background:
              "conic-gradient(from 230deg, currentColor 0deg, currentColor 120deg, rgba(255,255,255,0.08) 160deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(closest-side, transparent calc(100% - 3px), black calc(100% - 2px))",
            mask: "radial-gradient(closest-side, transparent calc(100% - 3px), black calc(100% - 2px))",
            opacity: 0.9,
          }}
        />
      )}
      {logoSrc ? (
        <div className="relative z-20 w-full h-full overflow-hidden transform-gpu transition-transform duration-200 ease-out group-hover:scale-105">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={logoSrc}
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none object-contain object-center max-w-[68%] max-h-[68%] w-auto h-auto"
            />
          </div>
        </div>
      ) : (
        <div className="relative z-20 action-card-content transform-gpu transition-transform duration-200 ease-out group-hover:scale-105 gap-2">
          <div
            className={`p-3 bg-gradient-to-br ${gradient} rounded-full transition-all duration-300 flex items-center justify-center ${
              hoverGradient ? `group-hover:${hoverGradient.split(" ").join(" group-hover:")}` : ""
            }`}
            aria-hidden="true"
          >
            {iconNode}
          </div>
          <h3 className="text-sm font-bold text-center text-white leading-tight px-1">{label}</h3>
        </div>
      )}
    </SurfaceCard>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel ?? label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="focus:outline-none"
      aria-label={ariaLabel ?? label}
    >
      {content}
    </button>
  );
}
