import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { CadenceAction, CadenceDay, ActionType } from "@/pages/sales-cadence/types";
import { SmsModal } from "./modals/SmsModal";
import { EmailModal } from "./modals/EmailModal";
import { CallTaskModal } from "./modals/CallTaskModal";
import { AddActionModal } from "./modals/AddActionModal";
import { DraggableAction } from "./DraggableAction";
import { DropZone } from "./DropZone";

interface DayTimelineProps {
  dayIndex: number;
  day: CadenceDay;
  onChange: (day: CadenceDay) => void;
}

export function DayTimeline({ dayIndex, day, onChange }: DayTimelineProps) {
  const [editingAction, setEditingAction] = useState<CadenceAction | null>(null);
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);

  function add(type: ActionType) {
    const id = `${day.dayNumber}-${type}-${Date.now()}`;

    // Only the first action on Day 1 can run immediately
    const isFirstActionOnDayOne = day.dayNumber === 1 && day.actions.length === 0;

    const newAction: CadenceAction = {
      id,
      type,
      scheduleRule: isFirstActionOnDayOne
        ? { kind: "immediately" }
        : { kind: "timeOfDay", timeOfDay: "09:00" },
      config: {},
    };
    setEditingAction(newAction);
  }

  function handleAddAction(type: ActionType) {
    add(type);
  }

  function onEdit(actionId: string) {
    const action = day.actions.find((a) => a.id === actionId);
    if (action) setEditingAction(action);
  }

  function onDelete(actionId: string) {
    onChange({ ...day, actions: day.actions.filter((a) => a.id !== actionId) });
  }

  function onMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...day.actions];
    const [m] = next.splice(index, 1);
    if (!m) return;
    next.splice(index - 1, 0, m);
    onChange({ ...day, actions: next });
  }

  function onMoveDown(index: number) {
    if (index >= day.actions.length - 1) return;
    const next = [...day.actions];
    const [m] = next.splice(index, 1);
    if (!m) return;
    next.splice(index + 1, 0, m);
    onChange({ ...day, actions: next });
  }

  function closeModal() {
    setEditingAction(null);
  }

  function onSaveAction(updated: CadenceAction) {
    const idx = day.actions.findIndex((a) => a.id === updated.id);
    if (idx === -1) {
      // New action
      onChange({ ...day, actions: [...day.actions, updated] });
    } else {
      // Update existing
      const next = [...day.actions];
      next[idx] = updated;
      onChange({ ...day, actions: next });
    }
    closeModal();
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-semibold border-orange-400 text-orange-400">
              Day {day.dayNumber}
            </Badge>
            <CardTitle className="text-sm font-normal text-gray-300">
              {day.actions.length} {day.actions.length === 1 ? "action" : "actions"}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {day.actions.length === 0 ? (
          <button
            onClick={() => setIsAddActionModalOpen(true)}
            className="w-full py-8 text-center border-2 border-dashed rounded-lg border-slate-600 hover:border-orange-400 hover:bg-slate-700/30 transition-all cursor-pointer"
          >
            <Plus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-300">Add your first action for Day {day.dayNumber}</p>
          </button>
        ) : (
          <div className="space-y-2">
            <DropZone id={`drop-day-${dayIndex}-pos-0`} />
            {day.actions.map((a, i) => (
              <div key={a.id}>
                <DraggableAction
                  dayIndex={dayIndex}
                  index={i}
                  action={a}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                />
                <DropZone id={`drop-day-${dayIndex}-pos-${i + 1}`} />
              </div>
            ))}

            {/* Add more actions button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddActionModalOpen(true)}
              className="w-full mt-2 text-gray-400 hover:text-white hover:bg-slate-700/50 border border-dashed border-slate-600 hover:border-orange-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add Action Modal */}
      <AddActionModal
        isOpen={isAddActionModalOpen}
        onClose={() => setIsAddActionModalOpen(false)}
        onSelectAction={handleAddAction}
        dayNumber={day.dayNumber}
      />

      {/* Edit Modals */}
      {editingAction && editingAction.type === "sms" && (
        <SmsModal
          open={!!editingAction}
          onOpenChange={(o: boolean) => !o && closeModal()}
          action={editingAction}
          onSave={onSaveAction}
          allowImmediately={day.dayNumber === 1 && day.actions.length === 0}
          dayNumber={day.dayNumber}
        />
      )}
      {editingAction && editingAction.type === "email" && (
        <EmailModal
          open={!!editingAction}
          onOpenChange={(o: boolean) => !o && closeModal()}
          action={editingAction}
          onSave={onSaveAction}
          allowImmediately={day.dayNumber === 1 && day.actions.length === 0}
          dayNumber={day.dayNumber}
        />
      )}
      {editingAction && editingAction.type === "call_task" && (
        <CallTaskModal
          open={!!editingAction}
          onOpenChange={(o: boolean) => !o && closeModal()}
          action={editingAction}
          onSave={onSaveAction}
          allowImmediately={day.dayNumber === 1 && day.actions.length === 0}
          dayNumber={day.dayNumber}
        />
      )}
    </Card>
  );
}
