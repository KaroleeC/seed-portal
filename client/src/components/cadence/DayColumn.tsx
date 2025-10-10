import { useState, useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { CadenceAction, CadenceDay } from "@/pages/sales-cadence/types";
import { ActionCard } from "./ActionCard";
import { SmsModal } from "./modals/SmsModal";
import { EmailModal } from "./modals/EmailModal";
import { CallTaskModal } from "./modals/CallTaskModal";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface DayColumnProps {
  dayIndex: number;
  day: CadenceDay;
  onChange: (day: CadenceDay) => void;
}

function DropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`h-2 my-1 rounded ${isOver ? "bg-primary/40" : "bg-muted"}`} />
  );
}

function DraggableAction({
  dayIndex,
  index,
  action,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  dayIndex: number;
  index: number;
  action: CadenceAction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `action-${action.id}`,
    data: { kind: "cadence-action", dayIndex, index, actionId: action.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-40" : undefined}
    >
      <ActionCard
        action={action}
        index={index}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}

export function DayColumn({ dayIndex, day, onChange }: DayColumnProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => day.actions.find((a) => a.id === editingId),
    [day.actions, editingId]
  );

  function add(type: CadenceAction["type"]) {
    const base: CadenceAction = {
      id: uid(),
      type,
      scheduleRule:
        day.actions.length === 0
          ? { kind: "immediately" }
          : { kind: "afterPrevious", minutesAfterPrev: 10 },
      config: {},
    };
    onChange({ ...day, actions: [...day.actions, base] });
    setEditingId(base.id);
  }

  function onEdit(actionId: string) {
    setEditingId(actionId);
  }

  function onDelete(actionId: string) {
    onChange({ ...day, actions: day.actions.filter((a) => a.id !== actionId) });
  }

  function onMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...day.actions];
    const [m] = next.splice(index, 1);
    next.splice(index - 1, 0, m);
    onChange({ ...day, actions: next });
  }

  function onMoveDown(index: number) {
    if (index >= day.actions.length - 1) return;
    const next = [...day.actions];
    const [m] = next.splice(index, 1);
    next.splice(index + 1, 0, m);
    onChange({ ...day, actions: next });
  }

  function closeModal() {
    setEditingId(null);
  }

  function onSaveAction(updated: CadenceAction) {
    const idx = day.actions.findIndex((a) => a.id === updated.id);
    if (idx === -1) return closeModal();
    const next = [...day.actions];
    next[idx] = updated;
    onChange({ ...day, actions: next });
    closeModal();
  }

  return (
    <Card className="min-w-[280px] h-full p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Day {day.dayNumber}</div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => add("sms")}>
            + SMS
          </Button>
          <Button size="sm" variant="outline" onClick={() => add("email")}>
            + Email
          </Button>
          <Button size="sm" variant="outline" onClick={() => add("call_task")}>
            + Call Task
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        {/* Drop slot at top of column */}
        <DropZone id={`drop-day-${dayIndex}-pos-0`} />
        {day.actions.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add an action
          </div>
        ) : (
          day.actions.map((a, i) => (
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
              {/* Drop slot after each action */}
              <DropZone id={`drop-day-${dayIndex}-pos-${i + 1}`} />
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {editing && editing.type === "sms" && (
        <SmsModal
          open={!!editing}
          onOpenChange={(o: boolean) => !o && closeModal()}
          action={editing as CadenceAction}
          onSave={onSaveAction}
        />
      )}
      {editing && editing.type === "email" && (
        <EmailModal
          open={!!editing}
          onOpenChange={(o: boolean) => !o && closeModal()}
          action={editing as CadenceAction}
          onSave={onSaveAction}
        />
      )}
      {editing && editing.type === "call_task" && (
        <CallTaskModal
          open={!!editing}
          onOpenChange={(o: boolean) => !o && closeModal()}
          action={editing as CadenceAction}
          onSave={onSaveAction}
        />
      )}
    </Card>
  );
}
