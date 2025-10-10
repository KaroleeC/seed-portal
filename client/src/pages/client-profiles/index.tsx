import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  useLeadConfig,
  useCreateNote,
  useCreateTask,
  useTimeline,
  useLeadForContact,
  usePatchLead,
} from "@/lib/crm";
import { AgentPanel } from "@/components/assistant/AgentPanel";

interface ContactSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  lastActivity?: string | null;
}

interface CRMDealItem {
  id: string;
  name: string;
  stage?: string | null;
}

interface CRMQuoteItem {
  id: number;
  monthlyFee: string;
}

interface ContactDetails extends ContactSummary {
  phone?: string | null;
  deals: CRMDealItem[];
  quotes: CRMQuoteItem[];
  notes?: unknown[];
  tasks?: unknown[];
  messages?: unknown[];
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ClientProfilesPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedQuery = useDebounced(query, 300);
  const [newNote, setNewNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [assignInput, setAssignInput] = useState("");

  const canSearch = debouncedQuery.trim().length >= 2;

  const searchKey = useMemo(() => ["crm:contacts:search", debouncedQuery], [debouncedQuery]);
  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: searchKey,
    enabled: canSearch,
    queryFn: async () => {
      const qs = new URLSearchParams({ q: debouncedQuery, limit: "25" });
      return await apiFetch<{ contacts: ContactSummary[]; total: number }>(
        "GET",
        `/api/crm/contacts/search?${qs}`
      );
    },
  });

  const { data: details, isLoading: loadingDetails } = useQuery({
    queryKey: ["crm:contacts:details", selectedId],
    enabled: !!selectedId,
    queryFn: async () => await apiFetch<ContactDetails>("GET", `/api/crm/contacts/${selectedId}`),
  });

  // M1: lead-config (for header controls)
  const { data: leadCfg } = useLeadConfig();
  // M2: timeline + create note/task
  const { data: timeline, isLoading: loadingTimeline } = useTimeline(selectedId);
  const noteMut = useCreateNote(details?.id ?? null);
  const taskMut = useCreateTask(details?.id ?? null);
  // M3: lead header controls
  const { data: lead } = useLeadForContact(details?.id ?? null);
  const patchLead = usePatchLead(lead?.id ?? null);

  const submitNote = async () => {
    if (!newNote.trim() || !details?.id) return;
    await noteMut.mutateAsync(newNote.trim());
    setNewNote("");
  };

  const submitTask = async () => {
    if (!taskTitle.trim() || !details?.id) return;
    await taskMut.mutateAsync({
      title: taskTitle.trim(),
      assigneeId: taskAssignee.trim() ? taskAssignee.trim() : null,
      dueDate: taskDue.trim() ? taskDue.trim() : null,
    });
    setTaskTitle("");
    setTaskAssignee("");
    setTaskDue("");
  };

  return (
    <div className="h-[calc(100vh-56px)] w-full grid grid-cols-12 gap-4 p-4">
      {/* Left: Search & Results */}
      <div className="col-span-3 flex flex-col border rounded-lg overflow-hidden">
        <div className="p-3 border-b bg-background">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts by name, email, or company..."
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {(() => {
            if (!canSearch) {
              return (
                <div className="p-3 text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </div>
              );
            }
            if (searching) {
              return <div className="p-3 text-sm">Searching…</div>;
            }
            if ((searchData?.contacts?.length || 0) === 0) {
              return <div className="p-3 text-sm">No results.</div>;
            }
            return (
              <ul>
                {searchData?.contacts?.map((c) => (
                  <li key={c.id} className="border-b">
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none ${
                        selectedId === c.email ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedId(c.email)}
                    >
                      <div className="font-medium">
                        {c.firstName || c.lastName
                          ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                          : c.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.companyName || c.email}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      </div>

      {/* Middle: Profile Canvas */}
      <div className="col-span-6 flex flex-col border rounded-lg overflow-hidden">
        <div className="p-3 border-b bg-background font-medium">Profile</div>
        <div className="flex-1 overflow-auto p-4">
          {(() => {
            if (!selectedId) {
              return (
                <div className="text-sm text-muted-foreground">
                  Select a contact to view details.
                </div>
              );
            }
            if (loadingDetails) {
              return <div>Loading…</div>;
            }
            if (!details) {
              return <div className="text-sm">Contact not found.</div>;
            }
            return (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-semibold">
                    {details.firstName || details.lastName
                      ? `${details.firstName ?? ""} ${details.lastName ?? ""}`.trim()
                      : details.email}
                  </div>
                  {details.companyName && (
                    <div className="text-sm text-muted-foreground">{details.companyName}</div>
                  )}
                  {details.phone && <div className="text-sm">{details.phone}</div>}
                  {/* Lead header controls */}
                  {lead && leadCfg && (
                    <div className="mt-3 grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label
                          htmlFor={`lead-status-${lead.id}`}
                          className="block text-xs text-muted-foreground mb-1"
                        >
                          Status
                        </label>
                        <select
                          className="w-full border rounded px-2 py-1 text-sm"
                          id={`lead-status-${lead.id}`}
                          value={lead.status}
                          onChange={(e) => patchLead.mutate({ status: e.target.value })}
                        >
                          {leadCfg.statuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`lead-stage-${lead.id}`}
                          className="block text-xs text-muted-foreground mb-1"
                        >
                          Stage
                        </label>
                        <select
                          className="w-full border rounded px-2 py-1 text-sm"
                          id={`lead-stage-${lead.id}`}
                          value={lead.stage}
                          onChange={(e) => patchLead.mutate({ stage: e.target.value })}
                        >
                          {leadCfg.stages.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`lead-assign-${lead.id}`}
                          className="block text-xs text-muted-foreground mb-1"
                        >
                          Assigned To (id or email)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`lead-assign-${lead.id}`}
                            value={assignInput}
                            onChange={(e) => setAssignInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = assignInput.trim();
                                if (v) patchLead.mutate({ assignedTo: v });
                                setAssignInput("");
                              }
                            }}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            className="px-3 py-1 text-sm border rounded hover:bg-accent"
                            onClick={() => {
                              // Clear assignment
                              patchLead.mutate({ assignedTo: null });
                            }}
                          >
                            Unassign
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-medium mb-2">Deals</div>
                  {details.deals && details.deals.length ? (
                    <ul className="text-sm space-y-1">
                      {details.deals.map((d) => (
                        <li key={d.id} className="flex items-center justify-between">
                          <span>{d.name}</span>
                          <span className="text-muted-foreground">{d.stage || "-"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">No deals.</div>
                  )}
                </div>

                <div>
                  <div className="font-medium mb-2">Quotes</div>
                  {details.quotes && details.quotes.length ? (
                    <ul className="text-sm space-y-1">
                      {details.quotes.map((q) => (
                        <li key={q.id} className="flex items-center justify-between">
                          <span>Quote #{q.id}</span>
                          <span className="text-muted-foreground">{`$${q.monthlyFee}/mo`}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">No quotes.</div>
                  )}
                </div>

                <div>
                  <div className="font-medium mb-2">Timeline</div>
                  {(() => {
                    if (loadingTimeline) {
                      return <div className="text-sm text-muted-foreground">Loading timeline…</div>;
                    }
                    if (!timeline) {
                      return <div className="text-sm text-muted-foreground">No timeline.</div>;
                    }
                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-1">Notes</div>
                          {timeline.notes?.length ? (
                            <ul className="text-sm space-y-1">
                              {timeline.notes.map((n) => (
                                <li key={n.id} className="border rounded p-2">
                                  {n.body}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(n.createdAt).toLocaleString()}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-muted-foreground">No notes.</div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1">Tasks</div>
                          {timeline.tasks?.length ? (
                            <ul className="text-sm space-y-1">
                              {timeline.tasks.map((t) => (
                                <li
                                  key={t.id}
                                  className="border rounded p-2 flex items-center justify-between"
                                >
                                  <div>
                                    <div>{t.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {t.status}
                                      {t.dueDate
                                        ? ` • due ${new Date(t.dueDate).toLocaleDateString()}`
                                        : ""}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-muted-foreground">No tasks.</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Right: Actions Rail */}
      <div className="col-span-3 flex flex-col border rounded-lg overflow-hidden">
        <div className="p-3 border-b bg-background font-medium">Actions</div>
        <div className="flex-1 overflow-auto">
          <AgentPanel initialMode="sell" />
          <div className="p-3 space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Add Note</div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
                rows={3}
                placeholder="Write a note…"
              />
              <button
                type="button"
                onClick={submitNote}
                disabled={!details?.id || !newNote.trim()}
                className="mt-2 px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
              >
                Save Note
              </button>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Add Task</div>
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mb-2"
                placeholder="Task title"
              />
              <input
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mb-2"
                placeholder="Assignee (id or email)"
              />
              <input
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mb-2"
              />
              <button
                type="button"
                onClick={submitTask}
                disabled={!details?.id || !taskTitle.trim()}
                className="px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
              >
                Create Task
              </button>
            </div>

            {leadCfg && (
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Allowed:</div>
                <div>Sources: {leadCfg.sources.join(", ")}</div>
                <div>Statuses: {leadCfg.statuses.join(", ")}</div>
                <div>Stages: {leadCfg.stages.join(", ")}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
