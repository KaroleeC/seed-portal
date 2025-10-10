import { useState, useCallback, useEffect, useMemo } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import type { LeadRow, LeadConfig } from "../types/leads.types";
import { useLeadMutations } from "./useLeadMutations";

interface UseKanbanDragDropParams {
  leads: LeadRow[];
  leadConfig?: LeadConfig;
}

export function useKanbanDragDrop({ leads, leadConfig }: UseKanbanDragDropParams) {
  const { toast } = useToast();
  const { updateLeadStage } = useLeadMutations();
  const [kanbanByStage, setKanbanByStage] = useState<Record<string, LeadRow[]>>({});
  const [activeDrag, setActiveDrag] = useState<{ lead: LeadRow; stage: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const buildKanban = useCallback(() => {
    const stages = leadConfig?.stages || [];
    const grouped: Record<string, LeadRow[]> = {};
    stages.forEach((s) => {
      grouped[s] = [];
    });
    for (const l of leads) {
      const s = (l.stage as string) || stages[0] || "unassigned";
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(l);
    }
    return grouped;
  }, [leads, leadConfig]);

  useEffect(() => {
    setKanbanByStage(buildKanban());
  }, [buildKanban]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const stage = (event.active.data.current?.stage as string) || "";
      const id = String(event.active.id || "");
      if (!stage || !id) return;
      const lead = (kanbanByStage[stage] || []).find((l) => l.id === id);
      if (lead) setActiveDrag({ lead, stage });
    },
    [kanbanByStage]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const overId = (event.over?.id as string) || undefined;
      const activeId = event.active.id as string;
      const fromStage = (event.active.data.current?.stage as string) || undefined;

      if (!overId || !fromStage || overId === fromStage) return;

      // Optimistic update
      const snapshot = JSON.parse(JSON.stringify(kanbanByStage)) as typeof kanbanByStage;
      let moved: LeadRow | undefined;
      const next: typeof kanbanByStage = { ...kanbanByStage };
      next[fromStage] = [...(next[fromStage] || [])];
      next[overId] = [...(next[overId] || [])];
      next[fromStage] = next[fromStage].filter((l) => {
        if (l.id === activeId) {
          moved = { ...l, stage: overId } as LeadRow;
          return false;
        }
        return true;
      });
      if (!moved) return;
      next[overId].unshift(moved);
      setKanbanByStage(next);

      // Persist to server
      try {
        await updateLeadStage(activeId, overId);
      } catch (e: unknown) {
        // Rollback on error
        setKanbanByStage(snapshot);
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: "Move failed", description: msg, variant: "destructive" });
      }
    },
    [kanbanByStage, updateLeadStage, toast]
  );

  return {
    kanbanByStage,
    sensors,
    activeDrag,
    setActiveDrag,
    handleDragStart,
    handleDragEnd,
  };
}
