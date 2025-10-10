import { useDraggable } from "@dnd-kit/core";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LeadRow } from "../types/leads.types";
import { toRelativeTime } from "../utils/leads-helpers";

interface LeadCardProps {
  lead: LeadRow;
  stage?: string;
  draggable?: boolean;
  onClick?: (leadId: string) => void;
}

export function LeadCard({ lead, stage, draggable = true, onClick }: LeadCardProps) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { stage },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const telDigits = lead.contactPhone ? String(lead.contactPhone).replace(/\D/g, "") : "";
  const telHref = telDigits ? `tel:${telDigits}` : undefined;
  const smsHref = telDigits ? `sms:${telDigits}` : undefined;
  const mailHref = lead.contactEmail ? `mailto:${lead.contactEmail}` : undefined;

  const handleClick = () => {
    if (onClick) onClick(lead.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      ref={draggable ? setNodeRef : undefined}
      style={style}
      {...(draggable ? listeners : {})}
      className={cn(
        "w-full p-3 rounded-lg surface-glass surface-motion hover:border-orange-400/70 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && "opacity-0"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="min-w-0">
        <div className="font-medium leading-tight truncate">
          {lead.contactCompanyName || lead.contactEmail || "No Company"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {lead.contactFirstName || lead.contactLastName
            ? `${lead.contactFirstName || ""} ${lead.contactLastName || ""}`.trim()
            : lead.contactEmail || "-"}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={telHref}
              onClick={(e) => {
                e.stopPropagation();
                if (!telHref) e.preventDefault();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded transition-colors hover:bg-emerald-500/10 text-emerald-400/80 hover:text-emerald-300",
                !telHref && "opacity-40 pointer-events-none"
              )}
              aria-label="Call"
            >
              <Phone className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>Call</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={mailHref}
              onClick={(e) => {
                e.stopPropagation();
                if (!mailHref) e.preventDefault();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded transition-colors hover:bg-sky-500/10 text-sky-400/80 hover:text-sky-300",
                !mailHref && "opacity-40 pointer-events-none"
              )}
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>Email</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={smsHref}
              onClick={(e) => {
                e.stopPropagation();
                if (!smsHref) e.preventDefault();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded transition-colors hover:bg-teal-500/10 text-teal-400/80 hover:text-teal-300",
                !smsHref && "opacity-40 pointer-events-none"
              )}
              aria-label="SMS"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>SMS</TooltipContent>
        </Tooltip>
      </div>

      <div className="text-xs text-muted-foreground mt-2">
        Created: {toRelativeTime(lead.createdAt)}
      </div>
    </div>
  );
}

/**
 * Static preview for drag overlay
 */
export function LeadCardPreview({ lead }: { lead: LeadRow }) {
  return (
    <div className="w-72 p-3 rounded-lg surface-glass text-left ring-2 ring-primary/40">
      <div className="font-medium leading-tight truncate">
        {lead.contactCompanyName || lead.contactEmail || "No Company"}
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {lead.contactFirstName || lead.contactLastName
          ? `${lead.contactFirstName || ""} ${lead.contactLastName || ""}`.trim()
          : lead.contactEmail || "-"}
      </div>
    </div>
  );
}
