import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import type {
  FiltersSnapshot,
  LeadsPrefs,
  ViewType,
  DensityType,
  ColumnKey,
} from "../types/leads.types";

const FILTERS_LS_KEY = "leadsInbox:filters";
const PREFS_SCOPE = "leads-inbox";

interface UseLeadFiltersReturn {
  // Filter state
  q: string;
  setQ: (value: string) => void;
  status: string | undefined;
  setStatus: (value: string | undefined) => void;
  stage: string | undefined;
  setStage: (value: string | undefined) => void;
  assignedTo: string | undefined;
  setAssignedTo: (value: string | undefined) => void;
  source: string | undefined;
  setSource: (value: string | undefined) => void;
  limit: number;
  setLimit: (value: number) => void;
  offset: number;
  setOffset: (value: number) => void;
  view: ViewType;
  setView: (value: ViewType) => void;

  // Table preferences
  density: DensityType;
  setDensity: (value: DensityType) => void;
  visibleCols: Record<ColumnKey, boolean>;
  setVisibleCols: React.Dispatch<React.SetStateAction<Record<ColumnKey, boolean>>>;
  columnOrder: ColumnKey[];
  setColumnOrder: React.Dispatch<React.SetStateAction<ColumnKey[]>>;
  colWidths: Record<ColumnKey, number>;
  setColWidths: React.Dispatch<React.SetStateAction<Record<ColumnKey, number>>>;

  // Actions
  saveDefaultPrefs: () => Promise<void>;
  savingDefault: boolean;
}

const defaultVisibleCols: Record<ColumnKey, boolean> = {
  company: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  stage: true,
  created: true,
  status: false,
  lastContacted: false,
  nextAction: false,
  source: false,
  actions: false,
};

const defaultColumnOrder: ColumnKey[] = [
  "company",
  "firstName",
  "lastName",
  "email",
  "phone",
  "status",
  "stage",
  "created",
  "lastContacted",
  "nextAction",
  "source",
];

const defaultColWidths: Record<ColumnKey, number> = {
  company: 260,
  firstName: 140,
  lastName: 140,
  email: 240,
  phone: 160,
  status: 120,
  stage: 140,
  source: 140,
  created: 160,
  lastContacted: 170,
  nextAction: 170,
  actions: 100,
};

export function useLeadFilters(userId?: string): UseLeadFiltersReturn {
  // Filter state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  const [view, setView] = useState<ViewType>("table");

  // Table preferences
  const [density, setDensity] = useState<DensityType>("comfortable");
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(defaultVisibleCols);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(defaultColumnOrder);
  const [colWidths, setColWidths] = useState<Record<ColumnKey, number>>(defaultColWidths);

  // Server defaults
  const [savingDefault, setSavingDefault] = useState(false);
  const didInitFromUrl = useRef(false);
  const didApplyServerDefaults = useRef(false);

  const applySnapshot = useCallback((snap: FiltersSnapshot) => {
    if (typeof snap.q === "string") setQ(snap.q);
    if (typeof snap.status === "string" || snap.status === undefined) setStatus(snap.status);
    if (typeof snap.stage === "string" || snap.stage === undefined) setStage(snap.stage);
    if (typeof snap.assignedTo === "string" || snap.assignedTo === undefined)
      setAssignedTo(snap.assignedTo);
    if (typeof snap.source === "string" || snap.source === undefined) setSource(snap.source);
    if (typeof snap.limit === "number" && !Number.isNaN(snap.limit)) setLimit(snap.limit);
    if (typeof snap.offset === "number" && !Number.isNaN(snap.offset)) setOffset(snap.offset);
    if (snap.view === "table" || snap.view === "kanban") setView(snap.view);
  }, []);

  const readFromUrl = useCallback((): FiltersSnapshot => {
    const p = new URLSearchParams(window.location.search);
    const limitV = p.get("limit");
    const offsetV = p.get("offset");
    const viewV = p.get("view");
    let viewParsed: ViewType | undefined;
    if (viewV === "table") viewParsed = "table";
    else if (viewV === "kanban") viewParsed = "kanban";
    return {
      q: p.get("q") || undefined,
      status: p.get("status") || undefined,
      stage: p.get("stage") || undefined,
      assignedTo: p.get("assignedTo") || undefined,
      source: p.get("source") || undefined,
      limit: limitV ? Number(limitV) : undefined,
      offset: offsetV ? Number(offsetV) : undefined,
      view: viewParsed,
    };
  }, []);

  const writeToUrlAndStorage = useCallback(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (stage) p.set("stage", stage);
    if (assignedTo) p.set("assignedTo", assignedTo);
    if (source) p.set("source", source);
    if (limit !== 25) p.set("limit", String(limit));
    if (offset) p.set("offset", String(offset));
    if (view !== "table") p.set("view", view);
    const newSearch = p.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
    try {
      const toSave: FiltersSnapshot = { q, status, stage, assignedTo, source, limit, offset, view };
      localStorage.setItem(FILTERS_LS_KEY, JSON.stringify(toSave));
    } catch {}
  }, [q, status, stage, assignedTo, source, limit, offset, view]);

  // Init from URL first, then fallback to localStorage
  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const snap = readFromUrl();
    const hasAny = Object.values(snap).some((v) => v !== undefined && v !== null && v !== "");
    if (hasAny) {
      applySnapshot(snap);
    } else {
      try {
        const raw = localStorage.getItem(FILTERS_LS_KEY);
        if (raw) {
          const ls: FiltersSnapshot = JSON.parse(raw);
          applySnapshot(ls);
        }
      } catch {}
    }
    const onPop = () => {
      const s = readFromUrl();
      applySnapshot(s);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applySnapshot, readFromUrl]);

  // Persist to URL + localStorage whenever relevant state changes
  useEffect(() => {
    writeToUrlAndStorage();
  }, [writeToUrlAndStorage]);

  // Load cross-device defaults from server (only if URL and LS didn't provide values)
  useEffect(() => {
    const load = async () => {
      if (didApplyServerDefaults.current) return;
      const hadUrl = window.location.search.length > 1;
      const hadLs = !!localStorage.getItem(FILTERS_LS_KEY);
      if (hadUrl || hadLs) return;
      try {
        const prefs = await apiFetch<LeadsPrefs>("GET", `/api/user/preferences/${PREFS_SCOPE}`);
        if (!prefs) return;
        // Apply filters/view
        applySnapshot({
          q: prefs.q,
          status: prefs.status,
          stage: prefs.stage,
          assignedTo: prefs.assignedTo,
          source: prefs.source,
          limit: prefs.limit,
          offset: prefs.offset,
          view: prefs.view,
        });
        // Apply table prefs
        if (prefs.visibleCols && typeof prefs.visibleCols === "object") {
          setVisibleCols((prev) => ({ ...prev, ...prefs.visibleCols }));
        }
        if (Array.isArray(prefs.columnOrder) && prefs.columnOrder.length) {
          setColumnOrder(prefs.columnOrder as ColumnKey[]);
        }
        if (prefs.colWidths && typeof prefs.colWidths === "object") {
          setColWidths((prev) => ({ ...prev, ...prefs.colWidths }));
        }
        if (prefs.density === "comfortable" || prefs.density === "compact")
          setDensity(prefs.density);
        didApplyServerDefaults.current = true;
      } catch {}
    };
    if (userId) void load();
  }, [userId, applySnapshot]);

  // Auto-bump page size in Kanban for better column completeness
  useEffect(() => {
    if (view === "kanban") {
      if (limit < 200) {
        setLimit(200);
        setOffset(0);
      }
    }
  }, [view, limit]);

  const assemblePrefs = useCallback(
    (): LeadsPrefs => ({
      q,
      status,
      stage,
      assignedTo,
      source,
      limit,
      offset,
      view,
      visibleCols,
      columnOrder,
      colWidths,
      density,
    }),
    [
      q,
      status,
      stage,
      assignedTo,
      source,
      limit,
      offset,
      view,
      visibleCols,
      columnOrder,
      colWidths,
      density,
    ]
  );

  const saveDefaultPrefs = useCallback(async () => {
    try {
      setSavingDefault(true);
      await apiFetch("PUT", `/api/user/preferences/${PREFS_SCOPE}`, assemblePrefs());
    } catch (e: unknown) {
      console.warn("Failed to save default prefs", e);
      throw e;
    } finally {
      setSavingDefault(false);
    }
  }, [assemblePrefs]);

  return {
    q,
    setQ,
    status,
    setStatus,
    stage,
    setStage,
    assignedTo,
    setAssignedTo,
    source,
    setSource,
    limit,
    setLimit,
    offset,
    setOffset,
    view,
    setView,
    density,
    setDensity,
    visibleCols,
    setVisibleCols,
    columnOrder,
    setColumnOrder,
    colWidths,
    setColWidths,
    saveDefaultPrefs,
    savingDefault,
  };
}
