import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DayTimeline } from "./DayTimeline";
import type { CadenceDay, CadenceModel } from "@/pages/sales-cadence/types";

interface CanvasProps {
  cadence: CadenceModel;
  onChangeDay: (idx: number, day: CadenceDay) => void;
  onMoveAction: (fromDay: number, fromIndex: number, toDay: number, toIndex: number) => void;
}

export function Canvas({ cadence, onChangeDay, onMoveAction }: CanvasProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(e: DragEndEvent) {
    const active = e.active;
    const over = e.over;
    if (!active || !over) return;

    const a = active.data.current as
      | { kind: "cadence-action"; dayIndex: number; index: number; actionId: string }
      | undefined;
    // over.id format: drop-day-<dayIndex>-pos-<pos>
    const m = String(over.id).match(/^drop-day-(\d+)-pos-(\d+)$/);
    if (!a || a.kind !== "cadence-action" || !m) return;
    const fromDay = Number(a.dayIndex);
    const fromIndex = Number(a.index);
    const toDay = Number(m[1]);
    const toIndex = Number(m[2]);

    onMoveAction(fromDay, fromIndex, toDay, toIndex);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Trigger */}
        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white">Trigger</CardTitle>
              <Badge variant="secondary">Lead Assigned</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">
              Starts when a lead is assigned. You can refine this later to specific assignees.
            </p>
          </CardContent>
        </Card>

        {/* Days */}
        {cadence.days.length === 0 ? (
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-gray-300">
                No days added yet. Click "Add Day" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          cadence.days.map((d, i) => (
            <DayTimeline
              key={d.dayNumber}
              dayIndex={i}
              day={d}
              onChange={(day) => onChangeDay(i, day)}
            />
          ))
        )}
      </div>
    </DndContext>
  );
}
