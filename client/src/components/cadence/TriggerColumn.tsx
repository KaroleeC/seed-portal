import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function TriggerColumn() {
  return (
    <Card className="min-w-[260px] h-full p-3 flex flex-col gap-3">
      <div className="text-sm font-semibold">Trigger</div>
      <div className="text-sm text-muted-foreground">When to start this cadence</div>
      <div className="flex items-center gap-2">
        <Badge variant="default">Lead Assigned</Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        Starts when a lead is assigned. You can refine this later to specific assignees.
      </div>
    </Card>
  );
}
