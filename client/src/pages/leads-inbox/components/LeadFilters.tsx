import { Loader2, Columns as ColumnsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ColumnKey, ViewType, DensityType, LeadConfig } from "../types/leads.types";

interface LeadFiltersProps {
  q: string;
  onQChange: (value: string) => void;
  status?: string;
  onStatusChange: (value: string | undefined) => void;
  stage?: string;
  onStageChange: (value: string | undefined) => void;
  assignedTo?: string;
  onAssignedToChange: (value: string | undefined) => void;
  source?: string;
  onSourceChange: (value: string | undefined) => void;
  density: DensityType;
  onDensityChange: (value: DensityType) => void;
  visibleCols: Record<ColumnKey, boolean>;
  onVisibleColsChange: (value: Record<ColumnKey, boolean>) => void;
  view: ViewType;
  isAdmin: boolean;
  isPrivileged: boolean;
  leadConfig?: LeadConfig;
  onSaveDefault: () => void;
  savingDefault: boolean;
}

export function LeadFilters({
  q,
  onQChange,
  status,
  onStatusChange,
  stage,
  onStageChange,
  assignedTo,
  onAssignedToChange,
  source,
  onSourceChange,
  density,
  onDensityChange,
  visibleCols,
  onVisibleColsChange,
  view,
  isAdmin,
  isPrivileged,
  leadConfig,
  onSaveDefault,
  savingDefault,
}: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-56">
        <label htmlFor="leads-search" className="block text-xs mb-1 text-muted-foreground">
          Search
        </label>
        <Input
          id="leads-search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search leads..."
        />
      </div>

      {isAdmin && (
        <div className="w-40">
          <div className="block text-xs mb-1 text-muted-foreground">Status</div>
          <Select
            value={status ?? "__any__"}
            onValueChange={(v) => onStatusChange(v === "__any__" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Any</SelectItem>
              {(leadConfig?.statuses || []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {view !== "kanban" && (
        <div className="w-56">
          <div className="block text-xs mb-1 text-muted-foreground">Stage</div>
          <Select
            value={stage ?? "__any__"}
            onValueChange={(v) => onStageChange(v === "__any__" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Any</SelectItem>
              {(leadConfig?.stages || [])
                .filter((s) => isPrivileged || s !== "unassigned")
                .map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isPrivileged && (
        <div className="w-48">
          <label htmlFor="assigned-to" className="block text-xs mb-1 text-muted-foreground">
            Assigned To
          </label>
          <Input
            id="assigned-to"
            value={assignedTo ?? ""}
            onChange={(e) => onAssignedToChange(e.target.value || undefined)}
            placeholder="user id / email"
          />
        </div>
      )}

      <div className="w-40">
        <div className="block text-xs mb-1 text-muted-foreground">Source</div>
        <Select
          value={source ?? "__any__"}
          onValueChange={(v) => onSourceChange(v === "__any__" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any__">Any</SelectItem>
            {(leadConfig?.sources || []).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Density (table only) */}
      {view !== "kanban" && (
        <div className="w-40">
          <div className="block text-xs mb-1 text-muted-foreground">Density</div>
          <Select
            value={density}
            onValueChange={(v) => onDensityChange(v === "compact" ? "compact" : "comfortable")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Comfortable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {view !== "kanban" && (
        <div>
          <div className="block text-xs mb-1 text-transparent">Columns</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ColumnsIcon className="w-4 h-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Default On</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  ["company", "Company"],
                  ["firstName", "First Name"],
                  ["lastName", "Last Name"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["stage", "Stage"],
                  ["created", "Created"],
                ] as [ColumnKey, string][]
              ).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={!!visibleCols[key]}
                  onCheckedChange={(checked) =>
                    onVisibleColsChange({ ...visibleCols, [key]: Boolean(checked) })
                  }
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Optional</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  ...(isAdmin ? ([["status", "Status"]] as [ColumnKey, string][]) : []),
                  ["lastContacted", "Last Contacted"],
                  ["nextAction", "Next Action"],
                ] as [ColumnKey, string][]
              ).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={!!visibleCols[key]}
                  onCheckedChange={(checked) =>
                    onVisibleColsChange({ ...visibleCols, [key]: Boolean(checked) })
                  }
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="ml-auto flex gap-2">
        <Button variant="outline" onClick={onSaveDefault} disabled={savingDefault}>
          {savingDefault && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save default
        </Button>
      </div>
    </div>
  );
}
