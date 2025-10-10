import { useCallback, useEffect, useRef, useMemo, useState, type KeyboardEvent } from "react";
import { format } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LeadRow, SortField, ColumnKey, DensityType } from "../types/leads.types";
import { formatPhoneUS, toRelativeTime, cellMotion } from "../utils/leads-helpers";

interface LeadsTableViewProps {
  leads: LeadRow[];
  isLoading: boolean;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onToggleSort: (field: SortField) => void;
  density: DensityType;
  visibleCols: Record<ColumnKey, boolean>;
  columnOrder: ColumnKey[];
  colWidths: Record<ColumnKey, number>;
  onColumnOrderChange: (newOrder: ColumnKey[]) => void;
  onColWidthsChange: (newWidths: Record<ColumnKey, number>) => void;
  onSelectLead: (leadId: string) => void;
  // Pagination
  limit: number;
  offset: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  onLimitChange: (limit: number) => void;
  onOffsetChange: (offset: number) => void;
}

const headerLabels: Record<ColumnKey, string> = {
  company: "Company",
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  status: "Status",
  stage: "Stage",
  created: "Created",
  lastContacted: "Last Contacted",
  nextAction: "Next Action",
  source: "Source",
  actions: "",
};

export function LeadsTableView({
  leads,
  isLoading,
  sortBy,
  sortOrder,
  onToggleSort,
  density,
  visibleCols,
  columnOrder,
  colWidths,
  onColumnOrderChange,
  onColWidthsChange,
  onSelectLead,
  limit,
  offset,
  total,
  hasNext,
  hasPrev,
  onLimitChange,
  onOffsetChange,
}: LeadsTableViewProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [resizing, setResizing] = useState<{
    key: ColumnKey;
    startX: number;
    startW: number;
  } | null>(null);

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

  const visibleCount = useMemo(
    () => columnOrder.filter((k) => visibleCols[k]).length || 1,
    [visibleCols, columnOrder]
  );

  const visibleOrderedCols = useMemo<ColumnKey[]>(
    () => columnOrder.filter((k): k is ColumnKey => Boolean(visibleCols[k])),
    [columnOrder, visibleCols]
  );

  // Handle column resize listeners
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing) return;
      const dx = e.clientX - resizing.startX;
      const next = Math.max(80, Math.min(600, resizing.startW + dx));
      onColWidthsChange({ ...colWidths, [resizing.key]: next });
    };
    const onUp = () => setResizing(null);
    if (resizing) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }
  }, [resizing, colWidths, onColWidthsChange]);

  const getCellText = (l: LeadRow, key: ColumnKey): string => {
    switch (key) {
      case "company":
        return l.contactCompanyName || l.contactEmail || "-";
      case "firstName":
        return l.contactFirstName || "-";
      case "lastName":
        return l.contactLastName || "-";
      case "email":
        return l.contactEmail || "-";
      case "phone":
        return l.contactPhone || "-";
      case "status":
        return l.status || "-";
      case "stage":
        return (l.stage || "").replace(/_/g, " ");
      case "created":
        return l.createdAt ? format(new Date(l.createdAt), "yyyy-MM-dd HH:mm") : "-";
      case "lastContacted":
        return l.lastContactedAt ? format(new Date(l.lastContactedAt), "yyyy-MM-dd HH:mm") : "-";
      case "nextAction":
        return l.nextActionAt ? format(new Date(l.nextActionAt), "yyyy-MM-dd HH:mm") : "-";
      case "source":
        return l.source || "-";
      default:
        return "";
    }
  };

  const measureTextWidth = (text: string): number => {
    if (!text) return 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return text.length * 8;
    const tableEl = tableRef.current;
    const font = tableEl ? getComputedStyle(tableEl).font : getComputedStyle(document.body).font;
    ctx.font = font || "14px system-ui";
    return ctx.measureText(text).width;
  };

  const autoSizeColumn = useCallback(
    (key: ColumnKey) => {
      if (!visibleCols[key]) return;
      const header = headerLabels[key] || "";
      let maxWidth = measureTextWidth(header);
      for (const l of sortedLeads) {
        const w = measureTextWidth(getCellText(l, key));
        if (w > maxWidth) maxWidth = w;
      }
      const padded = Math.ceil(maxWidth + 40);
      const clamped = Math.max(80, Math.min(600, padded));
      onColWidthsChange({ ...colWidths, [key]: clamped });
    },
    [visibleCols, sortedLeads, colWidths, onColWidthsChange]
  );

  const onResizerKeyDown = (key: ColumnKey) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = 10;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? -step : step;
      const current = colWidths[key] ?? 120;
      const next = Math.max(80, Math.min(600, current + delta));
      onColWidthsChange({ ...colWidths, [key]: next });
    }
  };

  const renderCell = (l: LeadRow, key: ColumnKey) => {
    switch (key) {
      case "company":
        return (
          <TableCell key={`${l.id}-company`} className={cellMotion}>
            {l.contactCompanyName || l.contactEmail || "-"}
          </TableCell>
        );
      case "firstName":
        return (
          <TableCell key={`${l.id}-firstName`} className={cellMotion}>
            {l.contactFirstName || "-"}
          </TableCell>
        );
      case "lastName":
        return (
          <TableCell key={`${l.id}-lastName`} className={cellMotion}>
            {l.contactLastName || "-"}
          </TableCell>
        );
      case "email":
        return (
          <TableCell key={`${l.id}-email`} className={cellMotion}>
            {l.contactEmail || "-"}
          </TableCell>
        );
      case "phone":
        return (
          <TableCell key={`${l.id}-phone`} className={cellMotion}>
            {formatPhoneUS(l.contactPhone)}
          </TableCell>
        );
      case "status":
        return (
          <TableCell key={`${l.id}-status`} className={cn("capitalize", cellMotion)}>
            {l.status}
          </TableCell>
        );
      case "stage":
        return (
          <TableCell key={`${l.id}-stage`} className={cn("capitalize", cellMotion)}>
            {(l.stage || "").replace(/_/g, " ")}
          </TableCell>
        );
      case "created": {
        const abs = format(new Date(l.createdAt), "yyyy-MM-dd HH:mm");
        const rel = toRelativeTime(l.createdAt);
        return (
          <TableCell key={`${l.id}-created`} className={cellMotion}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate cursor-help">{rel}</span>
              </TooltipTrigger>
              <TooltipContent>
                <span>{abs}</span>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      }
      case "lastContacted":
        return (
          <TableCell key={`${l.id}-lastContacted`} className={cellMotion}>
            {l.lastContactedAt ? format(new Date(l.lastContactedAt), "yyyy-MM-dd HH:mm") : "-"}
          </TableCell>
        );
      case "nextAction":
        return (
          <TableCell key={`${l.id}-nextAction`} className={cellMotion}>
            {l.nextActionAt ? format(new Date(l.nextActionAt), "yyyy-MM-dd HH:mm") : "-"}
          </TableCell>
        );
      case "source":
        return (
          <TableCell key={`${l.id}-source`} className={cn("capitalize", cellMotion)}>
            {l.source || "-"}
          </TableCell>
        );
      default:
        return null;
    }
  };

  const tableRows = (() => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={visibleCount}>Loading…</TableCell>
        </TableRow>
      );
    }
    if (!sortedLeads.length) {
      return (
        <TableRow>
          <TableCell colSpan={visibleCount}>No leads found</TableCell>
        </TableRow>
      );
    }
    return sortedLeads.map((l) => (
      <TableRow
        key={l.id}
        onClick={() => onSelectLead(l.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectLead(l.id);
          }
        }}
        className={cn(
          "group odd:bg-muted/30 even:bg-muted/20 lead-row-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 cursor-pointer",
          density === "compact" ? "[&_td]:py-2" : "[&_td]:py-3"
        )}
      >
        {visibleOrderedCols.map((key) => renderCell(l, key))}
      </TableRow>
    ));
  })();

  return (
    <>
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table ref={tableRef} className="table-fixed">
          <colgroup>
            {visibleOrderedCols.map((k) => (
              <col key={k} style={{ width: `${colWidths[k]}px` }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow
              className={cn(
                "sticky top-0 z-10 bg-muted/50 dark:bg-slate-900/70 backdrop-blur [&_th]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis",
                density === "compact" ? "[&_th]:py-2" : "[&_th]:py-3"
              )}
            >
              {visibleOrderedCols.map((key) => (
                <TableHead
                  key={`h-${key}`}
                  className="relative group"
                  draggable
                  onDragStart={(e) => {
                    const dt = e.dataTransfer;
                    if (dt) {
                      dt.setData("text/plain", key);
                      dt.effectAllowed = "move";
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const dt = e.dataTransfer;
                    if (dt) dt.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = (e.dataTransfer.getData("text/plain") || "") as ColumnKey;
                    if (!from || from === key) return;
                    const arr = [...columnOrder];
                    const fromIdx = arr.indexOf(from);
                    const toIdx = arr.indexOf(key);
                    if (fromIdx < 0 || toIdx < 0) return;
                    const [item] = arr.splice(fromIdx, 1);
                    arr.splice(toIdx, 0, item);
                    onColumnOrderChange(arr as ColumnKey[]);
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleSort(key as SortField)}
                    className="font-semibold px-0 justify-start truncate"
                  >
                    {headerLabels[key]}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none bg-transparent group-hover:bg-primary/30"
                    aria-label={`Resize column ${headerLabels[key]}`}
                    onKeyDown={onResizerKeyDown(key)}
                    onMouseDown={(e) =>
                      setResizing({ key, startX: e.clientX, startW: colWidths[key] })
                    }
                    onDoubleClick={() => autoSizeColumn(key)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{tableRows}</TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-xs">Rows per page</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                const n = Number(v);
                onLimitChange(n);
                onOffsetChange(0);
              }}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue placeholder="25" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            Showing {leads.length} of {total}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPrev}
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext}
            onClick={() => onOffsetChange(offset + limit)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
