import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Mail } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SendStatusBadgeProps {
  status: "sending" | "sent" | "delivered" | "failed" | "bounced";
  errorMessage?: string | null;
  bounceType?: string | null;
  retryCount?: number;
  maxRetries?: number;
  size?: "sm" | "default";
}

export function SendStatusBadge({
  status,
  errorMessage,
  bounceType,
  retryCount = 0,
  maxRetries = 3,
  size = "default",
}: SendStatusBadgeProps) {
  const config = {
    sending: {
      icon: Clock,
      label: "Sending",
      variant: "secondary" as const,
      className: "text-muted-foreground",
    },
    sent: {
      icon: CheckCircle2,
      label: "Sent",
      variant: "outline" as const,
      className: "text-green-600 dark:text-green-500",
    },
    delivered: {
      icon: Mail,
      label: "Delivered",
      variant: "outline" as const,
      className: "text-green-600 dark:text-green-500",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      variant: "destructive" as const,
      className: "text-destructive",
    },
    bounced: {
      icon: AlertTriangle,
      label: "Bounced",
      variant: "destructive" as const,
      className: "text-destructive",
    },
  };

  const { icon: Icon, label, variant, className } = config[status] || config.failed;

  const tooltipContent = () => {
    if (status === "failed" || status === "bounced") {
      return (
        <div className="space-y-1">
          <div className="font-semibold">{label}</div>
          {bounceType && <div className="text-xs text-muted-foreground">Type: {bounceType}</div>}
          {errorMessage && <div className="text-xs max-w-xs break-words">{errorMessage}</div>}
          {retryCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Retry attempts: {retryCount}/{maxRetries}
            </div>
          )}
        </div>
      );
    }
    return label;
  };

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={`gap-1 ${size === "sm" ? "text-xs px-1.5 py-0.5" : ""}`}
          >
            <Icon className={`${iconSize} ${className}`} />
            <span>{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
