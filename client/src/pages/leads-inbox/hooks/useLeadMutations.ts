import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { CRMLead } from "@shared/contracts";

export function useLeadMutations() {
  const queryClient = useQueryClient();

  const updateLeadStage = useCallback(
    async (leadId: string, newStage: string) => {
      await apiFetch<CRMLead>("PATCH", `/api/crm/leads/${leadId}`, { stage: newStage });
      // Refresh list in background
      await queryClient.invalidateQueries({ queryKey: ["crm:leads:list"] });
      await queryClient.invalidateQueries({ queryKey: ["crm:leads:details", leadId] });
    },
    [queryClient]
  );

  const updateLead = useCallback(
    async (leadId: string, updates: Partial<CRMLead>) => {
      await apiFetch<CRMLead>("PATCH", `/api/crm/leads/${leadId}`, updates);
      // Refresh list and details
      await queryClient.invalidateQueries({ queryKey: ["crm:leads:list"] });
      await queryClient.invalidateQueries({ queryKey: ["crm:leads:details", leadId] });
    },
    [queryClient]
  );

  return {
    updateLeadStage,
    updateLead,
  };
}
