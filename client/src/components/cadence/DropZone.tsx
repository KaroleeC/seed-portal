import { useDroppable } from "@dnd-kit/core";

interface DropZoneProps {
  id: string;
}

export function DropZone({ id }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`h-1 my-2 rounded transition-colors ${
        isOver ? "bg-orange-400" : "bg-transparent"
      }`}
    />
  );
}
