import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { CRMLead } from "@shared/contracts";

export type LeadConfig = { sources: string[]; statuses: string[]; stages: string[] };

export function useLeadConfig() {
  return useQuery({
    queryKey: ["crm:lead-config"],
    queryFn: async () => await apiFetch<LeadConfig>("GET", "/api/crm/lead-config"),
    staleTime: 15 * 60 * 1000,
  });
}

export interface NoteItem {
  id: string;
  contactId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  contactId: string;
  assigneeId: string | null;
  title: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt?: string;
}

export function useCreateNote(contactId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!contactId) throw new Error("contactId required");
      return await apiFetch<NoteItem>("POST", `/api/crm/contacts/${contactId}/notes`, { body });
    },
    onSuccess: () => {
      if (contactId) {
        qc.invalidateQueries({ queryKey: ["crm:contacts:details", contactId] });
        qc.invalidateQueries({ queryKey: ["crm:contacts:timeline", contactId] });
      }
    },
  });
}

export function useCreateTask(contactId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }) => {
      if (!contactId) throw new Error("contactId required");
      return await apiFetch<TaskItem>("POST", `/api/crm/contacts/${contactId}/tasks`, input);
    },
    onSuccess: () => {
      if (contactId) {
        qc.invalidateQueries({ queryKey: ["crm:contacts:details", contactId] });
        qc.invalidateQueries({ queryKey: ["crm:contacts:timeline", contactId] });
      }
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      status?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }) => {
      return await apiFetch<TaskItem>("PATCH", `/api/crm/tasks/${input.id}`, input);
    },
    onSuccess: (data) => {
      if (data?.contactId) {
        qc.invalidateQueries({ queryKey: ["crm:contacts:details", data.contactId] });
        qc.invalidateQueries({ queryKey: ["crm:contacts:timeline", data.contactId] });
      }
    },
  });
}

export function useTimeline(contactId: string | null) {
  return useQuery({
    queryKey: ["crm:contacts:timeline", contactId],
    enabled: !!contactId,
    queryFn: async () =>
      await apiFetch<{ notes: NoteItem[]; tasks: TaskItem[]; messages: unknown[] }>(
        "GET",
        `/api/crm/contacts/${contactId}/timeline`
      ),
  });
}

export function usePatchLead(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      status?: string;
      stage?: string;
      assignedTo?: string | null;
      source?: string;
    }) => {
      if (!id) throw new Error("lead id required");
      return await apiFetch<CRMLead>("PATCH", `/api/crm/leads/${id}`, patch);
    },
    onSuccess: (data) => {
      if (data?.contactId) {
        qc.invalidateQueries({ queryKey: ["crm:contacts:details", data.contactId] });
      }
    },
  });
}

export function useLeadForContact(contactId: string | null) {
  return useQuery({
    queryKey: ["crm:contacts:lead", contactId],
    enabled: !!contactId,
    queryFn: async () => await apiFetch<CRMLead>("GET", `/api/crm/contacts/${contactId}/lead`),
  });
}
