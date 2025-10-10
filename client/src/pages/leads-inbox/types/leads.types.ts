import type { CRMLead } from "@shared/contracts";

export type SortField =
  | "company"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "status"
  | "stage"
  | "source"
  | "created"
  | "lastContacted"
  | "nextAction";

export type ColumnKey =
  | "company"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "status"
  | "stage"
  | "created"
  | "lastContacted"
  | "nextAction"
  | "source"
  | "actions";

export type ViewType = "table" | "kanban";

export type DensityType = "comfortable" | "compact";

export interface FiltersSnapshot {
  q?: string;
  status?: string;
  stage?: string;
  assignedTo?: string;
  source?: string;
  limit?: number;
  offset?: number;
  view?: ViewType;
}

export interface LeadsPrefs extends FiltersSnapshot {
  visibleCols: Record<ColumnKey, boolean>;
  columnOrder: ColumnKey[];
  colWidths: Record<ColumnKey, number>;
  density: DensityType;
}

export interface LeadRow extends CRMLead {
  // Extended with any computed fields if needed
}

export interface LeadConfig {
  stages: string[];
  sources: string[];
  statuses: string[];
}
