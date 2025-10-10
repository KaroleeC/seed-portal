import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { LeadsListResult, CRMLead } from "@shared/contracts";
import type { ViewType } from "../types/leads.types";

interface UseLeadsQueryParams {
  status?: string;
  stage?: string;
  assignedTo?: string;
  source?: string;
  debouncedQuery: string;
  limit: number;
  offset: number;
  view: ViewType;
  isPrivileged: boolean;
  userId?: string;
}

export function useLeadsQuery(params: UseLeadsQueryParams) {
  const {
    status,
    stage,
    assignedTo,
    source,
    debouncedQuery,
    limit,
    offset,
    view,
    isPrivileged,
    userId,
  } = params;

  const queryKey = useMemo(
    () => [
      "crm:leads:list",
      {
        status,
        stage: view === "table" ? stage : undefined,
        assignedTo,
        source,
        dq: debouncedQuery,
        limit,
        offset,
        view,
      },
    ],
    [status, stage, assignedTo, source, debouncedQuery, limit, offset, view]
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (status) queryParams.set("status", status);
      if (view === "table" && stage) queryParams.set("stage", stage);

      // Sales reps can only see their own assigned leads (FE gate)
      if (!isPrivileged && userId) {
        queryParams.set("assignedTo", String(userId));
      } else if (assignedTo) {
        queryParams.set("assignedTo", assignedTo);
      }

      if (source) queryParams.set("source", source);
      if (debouncedQuery) queryParams.set("q", debouncedQuery);
      queryParams.set("view", view);
      queryParams.set("limit", String(limit));
      queryParams.set("offset", String(offset));

      return apiFetch<LeadsListResult>("GET", `/api/crm/leads?${queryParams.toString()}`);
    },
    refetchInterval: 30000, // Auto-refetch every 30 seconds to catch Zapier leads
    refetchOnWindowFocus: true, // Also refetch when user returns to tab
  });

  return query;
}

export function useLeadConfig() {
  return useQuery({
    queryKey: ["crm:lead-config"],
    queryFn: () =>
      apiFetch<{ stages: string[]; statuses: string[]; sources: string[] }>(
        "GET",
        "/api/crm/lead-config"
      ),
  });
}

export function useLeadDetails(leadId: string | null) {
  return useQuery({
    queryKey: ["crm:leads:details", leadId],
    enabled: !!leadId,
    queryFn: () => apiFetch<CRMLead>("GET", `/api/crm/leads/${leadId}`),
  });
}
