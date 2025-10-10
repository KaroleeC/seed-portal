import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Mail,
  MessageSquare,
  Phone,
  Clock,
} from "lucide-react";
import type { CadenceAction } from "@/pages/sales-cadence/types";

function scheduleSummary(a: CadenceAction): string {
  const r = a.scheduleRule;
  if (r.kind === "immediately") return "Immediately";
  if (r.kind === "timeOfDay") return `At ${r.timeOfDay ?? "--:--"}`;
  if (r.kind === "afterPrevious") return `${r.minutesAfterPrev ?? 0} min after previous`;
  return "";
}

function typeIcon(type: CadenceAction["type"]) {
  if (type === "sms") return <MessageSquare className="h-4 w-4" />;
  if (type === "email") return <Mail className="h-4 w-4" />;
  return <Phone className="h-4 w-4" />;
}

function typeLabel(type: CadenceAction["type"]) {
  if (type === "sms") return "SMS Message";
  if (type === "email") return "Email";
  return "Call Task";
}

function getPreview(action: CadenceAction): string {
  if (action.type === "sms" && action.config?.sms?.body) {
    return action.config.sms.body.substring(0, 80);
  }
  if (action.type === "email" && action.config?.email?.subject) {
    return action.config.email.subject;
  }
  if (action.type === "call_task") {
    return "Schedule a call task";
  }
  return "Click to configure";
}

interface ActionCardProps {
  action: CadenceAction;
  index: number;
  onEdit: (actionId: string) => void;
  onDelete: (actionId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function ActionCard({
  action,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ActionCardProps) {
  const preview = getPreview(action);

  return (
    <Card
      className="p-4 hover:shadow-lg transition-all cursor-pointer bg-slate-700/50 border-slate-600 hover:border-orange-400/50 hover:bg-slate-700/70"
      onClick={() => onEdit(action.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 text-orange-400">{typeIcon(action.type)}</div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{typeLabel(action.type)}</span>
              <Badge variant="secondary" className="text-xs bg-slate-600 text-gray-300">
                <Clock className="h-3 w-3 mr-1" />
                {scheduleSummary(action)}
              </Badge>
            </div>
            <p className="text-sm text-gray-300 truncate">{preview}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(index);
            }}
            aria-label="Move up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(index);
            }}
            aria-label="Move down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-300 hover:text-white hover:bg-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(action.id);
            }}
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(action.id);
            }}
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
