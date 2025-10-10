import { useState, useCallback, useEffect, useMemo } from "react";
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LeadCard, LeadCardPreview } from "../components/LeadCard";
import { useKanbanDragDrop } from "../hooks/useKanbanDragDrop";
import type { LeadRow, LeadConfig, SortField } from "../types/leads.types";

interface LeadsKanbanViewProps {
  leads: LeadRow[];
  leadConfig?: LeadConfig;
  onSelectLead: (leadId: string) => void;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
}

export function LeadsKanbanView({
  leads,
  leadConfig,
  onSelectLead,
  sortBy,
  sortOrder,
}: LeadsKanbanViewProps) {
  // Collapsed stages state
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const toggleCollapsed = useCallback(
    (s: string) => setCollapsedStages((prev) => ({ ...prev, [s]: !prev[s] })),
    []
  );

  // Kanban page size preference
  const KANBAN_PAGE_SIZE_LS_KEY = "leadsInbox:kanbanPageSize";
  const [kanbanPageSize, setKanbanPageSize] = useState<number>(25);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KANBAN_PAGE_SIZE_LS_KEY);
      const n = Number(raw);
      if (n === 25 || n === 50 || n === 100) setKanbanPageSize(n);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_PAGE_SIZE_LS_KEY, String(kanbanPageSize));
    } catch {}
  }, [kanbanPageSize]);

  // Client-side sorting
  const sortedLeads = useMemo(() => {
    const sorted = [...leads];
    sorted.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortBy) {
        case "company":
          aVal = (a.contactCompanyName || "").toLowerCase();
          bVal = (b.contactCompanyName || "").toLowerCase();
          break;
        case "firstName":
          aVal = (a.contactFirstName || "").toLowerCase();
          bVal = (b.contactFirstName || "").toLowerCase();
          break;
        case "lastName":
          aVal = (a.contactLastName || "").toLowerCase();
          bVal = (b.contactLastName || "").toLowerCase();
          break;
        case "email":
          aVal = (a.contactEmail || "").toLowerCase();
          bVal = (b.contactEmail || "").toLowerCase();
          break;
        case "phone":
          aVal = (a.contactPhone || "").toLowerCase();
          bVal = (b.contactPhone || "").toLowerCase();
          break;
        case "status":
          aVal = (a.status || "").toLowerCase();
          bVal = (b.status || "").toLowerCase();
          break;
        case "stage":
          aVal = (a.stage || "").toLowerCase();
          bVal = (b.stage || "").toLowerCase();
          break;
        case "source":
          aVal = (a.source || "").toLowerCase();
          bVal = (b.source || "").toLowerCase();
          break;
        case "lastContacted":
          aVal = new Date(a.lastContactedAt || 0).getTime();
          bVal = new Date(b.lastContactedAt || 0).getTime();
          break;
        case "nextAction":
          aVal = new Date(a.nextActionAt || 0).getTime();
          bVal = new Date(b.nextActionAt || 0).getTime();
          break;
        case "created":
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, sortBy, sortOrder]);

  const { kanbanByStage, sensors, activeDrag, setActiveDrag, handleDragStart, handleDragEnd } =
    useKanbanDragDrop({
      leads: sortedLeads,
      leadConfig,
    });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(e) => {
        handleDragEnd(e);
        setActiveDrag(null);
      }}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex gap-4 overflow-x-auto overflow-y-visible no-scrollbar pb-10">
        {(leadConfig?.stages || []).map((stage) => {
          const stageTheme: Record<string, { bg: string; text: string; border: string }> = {
            unassigned: {
              bg: "bg-slate-500/15",
              text: "text-slate-200",
              border: "border-slate-500/30",
            },
            assigned: { bg: "bg-blue-500/15", text: "text-blue-200", border: "border-blue-500/30" },
            contact_made: {
              bg: "bg-teal-500/15",
              text: "text-teal-200",
              border: "border-teal-500/30",
            },
            discovery_booked: {
              bg: "bg-amber-500/15",
              text: "text-amber-200",
              border: "border-amber-500/30",
            },
            quoted: {
              bg: "bg-violet-500/15",
              text: "text-violet-200",
              border: "border-violet-500/30",
            },
            closed_won: {
              bg: "bg-emerald-500/15",
              text: "text-emerald-200",
              border: "border-emerald-500/30",
            },
            closed_lost: {
              bg: "bg-rose-500/15",
              text: "text-rose-200",
              border: "border-rose-500/30",
            },
          };
          const themeObj = (stageTheme[stage as keyof typeof stageTheme] ??
            stageTheme.unassigned) as {
            bg: string;
            text: string;
            border: string;
          };
          const isCollapsed = !!collapsedStages[stage];

          const DroppableColumn: React.FC<{ id: string; children: React.ReactNode }> = ({
            id,
            children,
          }) => {
            const { setNodeRef, isOver } = useDroppable({ id });
            const accentBorder: Record<string, string> = {
              unassigned: "border-l-4 border-l-slate-500/70",
              assigned: "border-l-4 border-l-blue-500/70",
              contact_made: "border-l-4 border-l-teal-500/70",
              discovery_booked: "border-l-4 border-l-amber-500/70",
              quoted: "border-l-4 border-l-violet-500/70",
              closed_won: "border-l-4 border-l-emerald-500/70",
              closed_lost: "border-l-4 border-l-rose-500/70",
            } as const;
            const widthCls = isCollapsed ? "w-16 p-2" : "w-72 p-3";
            return (
              <div
                ref={setNodeRef}
                className={cn(
                  "flex-shrink-0 rounded-xl surface-glass surface-motion border-2 overflow-visible column-soft-fade column-shadow-soft",
                  widthCls,
                  accentBorder[stage as keyof typeof accentBorder] ||
                    "border-l-4 border-l-slate-500/70",
                  isOver && "ring-2 ring-primary/40 border-orange-400/70"
                )}
              >
                {children}
              </div>
            );
          };

          const leadsInStage = kanbanByStage[stage] || [];
          return (
            <DroppableColumn key={stage} id={stage}>
              {isCollapsed ? (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    className="h-6 w-6 grid place-items-center rounded-md hover:bg-white/5 relative z-10 mt-1"
                    aria-label={`Expand ${stage}`}
                    onClick={() => toggleCollapsed(stage)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div
                    className={cn(
                      "mt-9 inline-flex items-center gap-2 px-2 py-1 rounded-md border text-[11px] uppercase tracking-wider font-semibold -rotate-90 origin-center whitespace-nowrap relative z-20",
                      themeObj.bg,
                      themeObj.text,
                      themeObj.border
                    )}
                  >
                    <span className="">{stage.replace(/_/g, " ")}</span>
                    <span className="text-[10px] rounded bg-black/20 px-1.5 py-0.5">
                      {leadsInStage.length}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-2 py-1 rounded-md border text-[11px] uppercase tracking-wider font-semibold",
                        themeObj.bg,
                        themeObj.text,
                        themeObj.border
                      )}
                    >
                      <span className="truncate max-w-[9rem]">{stage.replace(/_/g, " ")}</span>
                      <span className="text-[10px] rounded bg-black/20 px-1.5 py-0.5">
                        {leadsInStage.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="h-6 w-6 grid place-items-center rounded-md hover:bg-white/5"
                      aria-label={`Collapse ${stage}`}
                      onClick={() => toggleCollapsed(stage)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-3 pt-6 pb-10 space-y-3">
                    {leadsInStage.map((l) => (
                      <LeadCard key={l.id} lead={l} stage={stage} onClick={onSelectLead} />
                    ))}
                    {leadsInStage.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">No leads</div>
                    )}
                  </div>
                </>
              )}
            </DroppableColumn>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <Select value={String(kanbanPageSize)} onValueChange={(v) => setKanbanPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DragOverlay>{activeDrag ? <LeadCardPreview lead={activeDrag.lead} /> : null}</DragOverlay>
    </DndContext>
  );
}
