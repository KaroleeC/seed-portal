import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";

interface ToolbarProps {
  name: string;
  isActive: boolean;
  onToggleActive: (v: boolean) => void;
  onAddDay: () => void;
  onSave: () => void;
}

export function Toolbar({ name, isActive, onToggleActive, onAddDay, onSave }: ToolbarProps) {
  const title = useMemo(() => name || "Untitled Cadence", [name]);
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="text-lg font-semibold truncate">{title}</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md border">
          <span className="text-sm">Active</span>
          <Switch checked={isActive} onCheckedChange={onToggleActive} />
        </div>
        <Button variant="outline" onClick={onAddDay}>
          Add Day
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </div>
  );
}
