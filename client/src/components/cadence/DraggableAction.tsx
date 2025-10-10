import { useDraggable } from "@dnd-kit/core";
import type { CadenceAction } from "@/pages/sales-cadence/types";
import { ActionCard } from "./ActionCard";

interface DraggableActionProps {
  dayIndex: number;
  index: number;
  action: CadenceAction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}

export function DraggableAction({
  dayIndex,
  index,
  action,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: DraggableActionProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${dayIndex}-${index}`,
    data: { dayIndex, index, action },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-50" : ""}>
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
