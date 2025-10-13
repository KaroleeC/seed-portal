import { useState, useCallback } from "react";
import { List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import ProfileDrawer from "@/components/crm/profile-drawer";
import { apps } from "@/assets";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDebounced } from "./hooks/useDebounced";
import { useLeadsQuery, useLeadConfig, useLeadDetails } from "./hooks/useLeadsQuery";
import { useLeadFilters } from "./hooks/useLeadFilters";
import { LeadsTableView } from "./views/LeadsTableView";
import { LeadsKanbanView } from "./views/LeadsKanbanView";
import { LeadFilters } from "./components/LeadFilters";
import { getDialogTitle } from "./utils/leads-helpers";
import type { SortField } from "./types/leads.types";

export default function LeadsInboxPage() {
  const { user } = useAuth();
  const { isAdmin, hasAnyPermission } = usePermissions();
  const { toast } = useToast();
  const isPrivileged = isAdmin || hasAnyPermission(["leads.manage", "leads.assign"]);

  // Selected lead for profile drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sorting state (managed at orchestrator level for both views)
  const [sortBy, setSortBy] = useState<SortField>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Use extracted hooks for filter state
  const filters = useLeadFilters(user?.id);

  // Debounce search query
  const debouncedQuery = useDebounced(filters.q, 300);

  // Fetch lead config (stages, sources, statuses)
  const { data: leadConfig } = useLeadConfig();

  // Fetch leads list
  const { data, isLoading } = useLeadsQuery({
    status: filters.status,
    stage: filters.stage,
    assignedTo: filters.assignedTo,
    source: filters.source,
    debouncedQuery,
    limit: filters.limit,
    offset: filters.offset,
    view: filters.view,
    isPrivileged,
    userId: user?.id,
  });

  // Fetch selected lead details
  const { data: leadDetails } = useLeadDetails(selectedId);

  // Toggle sort
  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder(field === "created" ? "desc" : "asc");
      }
    },
    [sortBy, sortOrder]
  );

  // Save default preferences
  const handleSaveDefault = useCallback(async () => {
    try {
      await filters.saveDefaultPrefs();
      toast({ title: "Default saved", description: "Your leads view was saved." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  }, [filters, toast]);

  // Pagination helpers
  const hasNext = (data?.total ?? 0) > filters.offset + (data?.leads?.length ?? 0);
  const hasPrev = filters.offset > 0;

  return (
    <TooltipProvider delayDuration={50}>
      <DashboardLayout maxWidthClassName="max-w-7xl" header={<></>}>
        {/* Centered page logo */}
        <div className="mb-4 flex items-center justify-center">
          <img src={apps.leadiq.light} alt="Leads Inbox" className="h-48 block dark:hidden" />
          <img src={apps.leadiq.dark} alt="Leads Inbox" className="h-48 hidden dark:block" />
        </div>

        <div className="space-y-4">
          {/* Centered View Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex gap-1 border rounded">
              <Button
                size="sm"
                variant={filters.view === "table" ? "default" : "ghost"}
                onClick={() => filters.setView("table")}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
              <Button
                size="sm"
                variant={filters.view === "kanban" ? "default" : "ghost"}
                onClick={() => filters.setView("kanban")}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban
              </Button>
            </div>
          </div>

          {/* Filters */}
          <LeadFilters
            q={filters.q}
            onQChange={filters.setQ}
            status={filters.status}
            onStatusChange={filters.setStatus}
            stage={filters.stage}
            onStageChange={filters.setStage}
            assignedTo={filters.assignedTo}
            onAssignedToChange={filters.setAssignedTo}
            source={filters.source}
            onSourceChange={filters.setSource}
            density={filters.density}
            onDensityChange={filters.setDensity}
            visibleCols={filters.visibleCols}
            onVisibleColsChange={filters.setVisibleCols}
            view={filters.view}
            isAdmin={isAdmin}
            isPrivileged={isPrivileged}
            leadConfig={leadConfig}
            onSaveDefault={handleSaveDefault}
            savingDefault={filters.savingDefault}
          />

          {/* Conditional View Rendering */}
          {filters.view === "table" ? (
            <LeadsTableView
              leads={data?.leads || []}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onToggleSort={toggleSort}
              density={filters.density}
              visibleCols={filters.visibleCols}
              columnOrder={filters.columnOrder}
              colWidths={filters.colWidths}
              onColumnOrderChange={filters.setColumnOrder}
              onColWidthsChange={filters.setColWidths}
              onSelectLead={setSelectedId}
              limit={filters.limit}
              offset={filters.offset}
              total={data?.total ?? 0}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onLimitChange={filters.setLimit}
              onOffsetChange={filters.setOffset}
            />
          ) : (
            <LeadsKanbanView
              leads={data?.leads || []}
              leadConfig={leadConfig}
              onSelectLead={setSelectedId}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          )}

          {/* Lead Profile Dialog */}
          <Dialog
            open={!!selectedId}
            onOpenChange={(o) => {
              if (!o) setSelectedId(null);
            }}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{getDialogTitle(leadDetails)}</DialogTitle>
              </DialogHeader>
              <ProfileDrawer
                open={false}
                onOpenChange={() => {}}
                contactIdOrEmail={leadDetails?.contactId ?? null}
                lead={leadDetails ?? null}
                title=""
                isModal={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
