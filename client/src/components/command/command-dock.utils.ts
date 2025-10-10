// Utilities for Command Dock filtering/scoring used by golden tests (no runtime coupling required)
export type NavCategory = "Apps" | "Admin" | "Settings" | "Profile";

export type Recent = { count: number; ts: number };
export type Recents = Record<string, Recent>;

export function applyOperatorFilters(raw: string): { categoryFilter?: NavCategory; q: string } {
  const opMatch = raw.match(/\b(?:apps|settings|admin|profile|role):\w+/gi) || [];
  let categoryFilter: NavCategory | undefined;
  let q = raw;
  for (const token of opMatch) {
    const [k = "", v = ""] = token.split(":");
    const key = k.toLowerCase();
    const val = (v || "").toLowerCase();
    if (key === "apps") categoryFilter = "Apps";
    else if (key === "settings") categoryFilter = "Settings";
    else if (key === "admin" || (key === "role" && val === "admin")) categoryFilter = "Admin";
    else if (key === "profile") categoryFilter = "Profile";
    q = q.replace(token, "");
  }
  q = q.trim().toLowerCase();
  return { categoryFilter, q };
}

export function buildSearchBlob(label: string, keywords?: string[]): string {
  return `${label} ${(keywords || []).join(" ")}`.toLowerCase();
}

export function clampIndex(i: number, delta: number, max: number): number {
  const next = i + delta;
  return Math.max(0, Math.min(max, next));
}

export function scoreItemLike(
  item: {
    id: string;
    label: string;
    keywords?: string[];
    searchBlob?: string;
    category: NavCategory;
  },
  q: string,
  opts?: { location?: string; recents?: Recents }
): number {
  let s = 0;
  const label = item.label.toLowerCase();
  const words = (item.keywords || []).map((k) => k.toLowerCase());
  const blob = item.searchBlob || `${label} ${words.join(" ")}`;
  const id = item.id;

  if (!q) return 1; // neutral when empty query (mirrors CommandDock)
  if (label === q) s += 100;
  if (label.startsWith(q)) s += 40;
  if (blob.includes(q)) s += 25;
  for (const kw of words) {
    if (kw === q) s += 60;
    else if (kw.startsWith(q)) s += 30;
    else if (kw.includes(q)) s += 15;
  }

  const loc = opts?.location;
  if (loc?.startsWith("/admin")) {
    if (label.includes("rbac") || label.includes("user management") || label.includes("settings"))
      s += 10;
  } else if (loc?.startsWith("/service-dashboard")) {
    if (label.includes("client profiles") || label.includes("leads") || label.includes("settings"))
      s += 6;
  } else if (loc?.startsWith("/sales-dashboard") || loc === "/") {
    if (
      label.includes("seedqc") ||
      label.includes("seedpay") ||
      blob.includes("kb") ||
      blob.includes("leads")
    )
      s += 8;
  } else if (loc?.startsWith("/assistant")) {
    if (blob.includes("ai") || blob.includes("assistant")) s += 8;
  }

  const r = opts?.recents?.[id];
  if (r) {
    const ageMs = Date.now() - r.ts;
    const fresh = Math.max(0, 1 - ageMs / (7 * 24 * 60 * 60 * 1000));
    s += Math.log1p(r.count) * 8 + fresh * 12;
  }
  return s;
}
