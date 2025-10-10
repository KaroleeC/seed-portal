import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { misc } from "@/assets";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useLocation } from "wouter";
import {
  Search,
  Settings,
  Calculator,
  BarChart3,
  Users,
  BookOpen,
  Headphones,
  Shield,
  Command,
  DollarSign,
  Inbox,
  ChevronDown,
  ChevronUp,
  Star,
  Bot,
  Sun,
  Moon,
  Bell,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { PERMISSIONS, type Permission, type UserRole } from "@shared/permissions";
import { useTheme } from "@/theme";

type IconType = React.ComponentType<{ className?: string }>;
type NavCategory = "Apps" | "Admin" | "Settings" | "Profile";
type NavItemBase = {
  id: string;
  label: string;
  icon: IconType;
  keywords?: string[];
  required?: Permission[];
  category: NavCategory;
  searchBlob?: string;
};
type NavItemRoute = NavItemBase & { to: string; onSelect?: never };
type NavItemAction = NavItemBase & { onSelect: () => void; to?: never };
type NavItem = NavItemRoute | NavItemAction;

const RECENTS_KEY = "commandDock.recents";
type Recents = Record<string, { count: number; ts: number }>;
const PINS_KEY = "commandDock.pins";

// Stable category order for grouped rendering
const CATEGORY_ORDER: NavCategory[] = ["Apps", "Admin", "Settings", "Profile"];

function isRoute(item: NavItem): item is NavItemRoute {
  return (item as NavItemRoute).to !== undefined;
}

function getPins(): string[] {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function togglePin(id: string) {
  try {
    const pins = new Set(getPins());
    if (pins.has(id)) pins.delete(id);
    else pins.add(id);
    localStorage.setItem(PINS_KEY, JSON.stringify(Array.from(pins)));
  } catch {}
}

function clearRecents() {
  try {
    localStorage.removeItem(RECENTS_KEY);
  } catch {}
}

type CommandRBACConfig = {
  byCommand?: Record<string, { required?: Permission[] | null; hide?: boolean }>;
  byRole?: Partial<Record<UserRole, { hide?: string[] }>>;
};

function getRBACConfig(): CommandRBACConfig {
  try {
    const raw = localStorage.getItem("commandDock.rbac");
    return raw ? (JSON.parse(raw) as CommandRBACConfig) : {};
  } catch {
    return {};
  }
}

function isAction(item: NavItem): item is NavItemAction {
  return typeof (item as NavItemAction).onSelect === "function";
}

function getRecents(): Recents {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Recents) : {};
  } catch {
    return {};
  }
}

function bumpRecent(id: string) {
  try {
    const recents = getRecents();
    const prev = recents[id] || { count: 0, ts: 0 };
    recents[id] = { count: prev.count + 1, ts: Date.now() };
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {}
}

function emit(action: string, payload: Record<string, unknown> = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent("telemetry", { detail: { type: "command-dock", action, ...payload } })
    );
  } catch {}
  try {
    // Optional analytics endpoint via Vite env
    const meta = import.meta as unknown as { env?: { VITE_TELEMETRY_URL?: string } };
    const url = meta.env?.VITE_TELEMETRY_URL;
    if (url && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([JSON.stringify({ type: "command-dock", action, ...payload })], {
        type: "application/json",
      });
      navigator.sendBeacon(url, blob);
    }
  } catch {}
}

/**
 * CommandDock
 * App-wide bottom-left command launcher. Opens via Cmd/Ctrl+K or clicking the button.
 * - Quick Nav: common destinations
 * - Keyboard: listens to 'seed-toggle-command-dock'
 */
export function CommandDock() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputModeRef = useRef<"mouse" | "keyboard">("mouse");
  const { toast } = useToast();
  const { hasAnyPermission, userRole } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();
  const { logoutMutation } = useAuth();
  const queryDebounceRef = useRef<number | null>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const [hasMoreAbove, setHasMoreAbove] = useState(false);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const [pinsTick, setPinsTick] = useState(0);
  // Explicit Command Dock logo (provided asset); fallback to icon if not resolved
  const dockLogoUrl = misc.commandDock;

  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener("seed-toggle-command-dock", handler as EventListener);
    return () => window.removeEventListener("seed-toggle-command-dock", handler as EventListener);
  }, []);

  // Close on route change
  useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Telemetry on open/close
  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent("telemetry", {
          detail: { type: "command-dock", action: open ? "open" : "close" },
        })
      );
    } catch {}
  }, [open]);

  // (moved) telemetry for query is defined later, after 'filtered' is defined

  // Focus management when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const navItems: NavItem[] = useMemo(() => {
    const base: NavItem[] = [
      // Apps
      {
        id: "apps.sales",
        label: "Sales Dashboard",
        icon: BarChart3,
        to: "/sales-dashboard",
        category: "Apps",
      },
      {
        id: "apps.service",
        label: "Service Dashboard",
        icon: Headphones,
        to: "/service-dashboard",
        category: "Apps",
      },
      {
        id: "apps.admin",
        label: "Admin Dashboard",
        icon: Shield,
        to: "/admin",
        required: [PERMISSIONS.VIEW_ADMIN_DASHBOARD],
        category: "Admin",
      },
      {
        id: "apps.seedqc",
        label: "SEEDQC",
        icon: Calculator,
        to: "/apps/seedqc",
        keywords: ["quote", "pricing", "calculator", "seedqc", "quote builder"],
        category: "Apps",
      },
      {
        id: "apps.leads",
        label: "LEADIQ",
        icon: Inbox,
        to: "/leads-inbox",
        keywords: ["leads", "inbox"],
        category: "Apps",
      },
      {
        id: "apps.clientProfiles",
        label: "CLIENTIQ",
        icon: Users,
        to: "/client-profiles",
        keywords: ["clients", "profiles", "accounts"],
        category: "Apps",
      },
      {
        id: "apps.kb",
        label: "SEEDKB",
        icon: BookOpen,
        to: "/knowledge-base",
        keywords: ["kb", "knowledge", "articles", "playbook"],
        category: "Apps",
      },
      {
        id: "apps.seedpay",
        label: "SEEDPAY",
        icon: DollarSign,
        to: "/apps/seedpay",
        keywords: ["commission", "payouts", "seedpay", "pay"],
        category: "Apps",
      },
      {
        id: "apps.ai",
        label: "SEEDAI",
        icon: Bot,
        to: "/assistant",
        keywords: ["ai", "assistant", "workspace", "copilot"],
        category: "Apps",
      },
      {
        id: "apps.userManagement",
        label: "User Management",
        icon: Users,
        to: "/user-management",
        keywords: ["users", "invites", "roles"],
        required: [PERMISSIONS.MANAGE_USERS],
        category: "Admin",
      },
      {
        id: "apps.rbac",
        label: "RBAC Management",
        icon: Shield,
        to: "/admin/rbac",
        keywords: ["permissions", "rbac", "access", "roles"],
        required: [PERMISSIONS.MANAGE_USERS],
        category: "Admin",
      },
      {
        id: "apps.settingsHub",
        label: "Settings Hub",
        icon: Settings,
        to: "/settings",
        category: "Settings",
      },
      {
        id: "profile",
        label: "Profile Settings",
        icon: Users,
        to: "/profile",
        keywords: ["profile", "account", "settings"],
        category: "Profile",
      },
      // Logout action
      {
        id: "profile.logout",
        label: "Log Out",
        icon: LogOut,
        keywords: ["logout", "sign out", "exit"],
        onSelect: () => {
          logoutMutation.mutate();
        },
        category: "Profile",
      } as NavItemAction,
      // Settings (existing)
      {
        id: "settings.seedqc",
        label: "SeedQC Settings",
        icon: Calculator,
        to: "/settings#seedqc",
        keywords: ["quote", "pricing", "calculator", "seedqc"],
        required: [PERMISSIONS.MANAGE_PRICING],
        category: "Settings",
      },
      {
        id: "settings.seedpay",
        label: "SeedPay Settings",
        icon: DollarSign,
        to: "/settings#seedpay",
        keywords: ["commission", "payouts", "seedpay", "payments"],
        required: [PERMISSIONS.MANAGE_COMMISSIONS],
        category: "Settings",
      },

      // Settings (placeholders → toast + redirect to Settings Hub)
      {
        id: "settings.seedkb",
        label: "SeedKB Settings",
        icon: BookOpen,
        to: "/settings#seedkb",
        keywords: ["seedkb", "kb", "knowledge", "settings"],
        category: "Settings",
      },
      {
        id: "settings.clientProfiles",
        label: "Client Profiles Settings",
        icon: Users,
        to: "/settings#client-profiles",
        keywords: ["client", "profiles", "settings"],
        category: "Settings",
      },
      {
        id: "settings.leadsInbox",
        label: "Leads Inbox Settings",
        icon: Inbox,
        to: "/settings#leads-inbox",
        keywords: ["leads", "inbox", "settings"],
        category: "Settings",
      },

      // Theme toggle (action)
      {
        id: "settings.themeToggle",
        label: resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        onSelect: () => {
          const next: "light" | "dark" = resolvedTheme === "dark" ? "light" : "dark";
          setTheme(next);
          toast({ title: "Theme updated", description: `Switched to ${next} mode.` });
        },
        category: "Settings",
      } as NavItemAction,

      // Notifications stub (action)
      {
        id: "settings.notifications",
        label: "Notifications (Coming Soon)",
        icon: Bell,
        onSelect: () => {
          toast({
            title: "Notifications",
            description: "Notifications will land in the Command Dock soon.",
          });
        },
        category: "Settings",
      } as NavItemAction,
    ];
    return base.map((i) => ({
      ...i,
      searchBlob: `${i.label} ${(i.keywords || []).join(" ")}`.toLowerCase(),
    }));
  }, [resolvedTheme, setTheme, toast, logoutMutation]);

  // Simple fuzzy scoring with aliases and context boosts
  const scoreItem = useCallback(
    (item: NavItem, q: string) => {
      let s = 0;
      const label = item.label.toLowerCase();
      const words = (item.keywords || []).map((k) => k.toLowerCase());
      const blob = (item as NavItemBase).searchBlob || `${label} ${words.join(" ")}`;
      const id = isRoute(item) ? item.to : item.label;

      if (!q) return 1; // neutral when empty query
      if (label === q) s += 100;
      if (label.startsWith(q)) s += 40;
      if (blob.includes(q)) s += 25;
      for (const kw of words) {
        if (kw === q) s += 60;
        else if (kw.startsWith(q)) s += 30;
        else if (kw.includes(q)) s += 15;
      }

      // Context boosts by current route
      if (location?.startsWith("/admin")) {
        if (
          label.includes("rbac") ||
          label.includes("user management") ||
          label.includes("settings")
        )
          s += 10;
      } else if (location?.startsWith("/service-dashboard")) {
        if (
          label.includes("client profiles") ||
          label.includes("leads") ||
          label.includes("settings")
        )
          s += 6;
      } else if (location?.startsWith("/sales-dashboard") || location === "/") {
        if (
          label.includes("seedqc") ||
          label.includes("seedpay") ||
          blob.includes("kb") ||
          blob.includes("leads")
        )
          s += 8;
      } else if (location?.startsWith("/assistant")) {
        if (blob.includes("ai") || blob.includes("assistant")) s += 8;
      }

      // Recency/frequency boost
      const recents = getRecents();
      const r = recents[id];
      if (r) {
        // boost by log(count) and freshness (last 7 days)
        const ageMs = Date.now() - r.ts;
        const fresh = Math.max(0, 1 - ageMs / (7 * 24 * 60 * 60 * 1000));
        s += Math.log1p(r.count) * 8 + fresh * 12;
      }
      return s;
    },
    [location]
  );

  const filtered: NavItem[] = useMemo(() => {
    // Parse simple operators like apps:, settings:, admin:, profile:, role:
    const raw = query.trim();
    let categoryFilter: NavCategory | undefined;
    let q = raw;
    const opMatch = raw.match(/\b(?:apps|settings|admin|profile|role):\w+/gi) || [];
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
    const rank = (c: NavCategory | undefined) => {
      const idx = CATEGORY_ORDER.indexOf((c as NavCategory) || "Apps");
      return idx === -1 ? 0 : idx;
    };
    // RBAC filtering first (permission-based with overrides)
    const cfg = getRBACConfig();
    const visible = navItems
      .filter((i) => {
        const id = i.id;
        // Role-specific hide
        const roleHide = cfg.byRole?.[userRole]?.hide || [];
        if (roleHide.includes(id)) return false;
        // Command-specific overrides
        const ov = cfg.byCommand?.[id];
        if (ov?.hide) return false;
        const effectiveRequired = ov?.required === undefined ? i.required : (ov.required ?? []);
        return effectiveRequired ? hasAnyPermission(effectiveRequired) : true;
      })
      .filter((i) => (categoryFilter ? i.category === categoryFilter : true));
    const scored = [...visible]
      .map((item, idx) => ({ item, score: q ? scoreItem(item, q) : 1, idx }))
      .filter((x) => (q ? x.score > 0 : true))
      .sort(
        (a, b) =>
          rank(a.item.category) - rank(b.item.category) || b.score - a.score || a.idx - b.idx
      )
      .slice(0, 50);
    return scored.map(({ item }) => item);
  }, [navItems, query, scoreItem, hasAnyPermission, userRole]);

  // Telemetry for query (debounced)
  useEffect(() => {
    if (!open) return;
    if (queryDebounceRef.current) {
      window.clearTimeout(queryDebounceRef.current);
    }
    queryDebounceRef.current = window.setTimeout(() => {
      const q = query.trim();
      emit("query", { q, results: q ? filtered.length : 0, ts: Date.now() });
    }, 300);
    return () => {
      if (queryDebounceRef.current) window.clearTimeout(queryDebounceRef.current);
    };
  }, [query, filtered.length, open]);

  useEffect(() => {
    // Reset active index when list changes
    setActiveIndex(0);
  }, [query]);

  // Global keyboard handling while dock is open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        inputModeRef.current = "keyboard";
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        inputModeRef.current = "keyboard";
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        const item = filtered[activeIndex];
        if (item) {
          e.preventDefault();
          setOpen(false);
          const idForTelem = isRoute(item) ? item.to : item.label;
          emit("select", {
            id: idForTelem,
            label: item.label,
            to: isRoute(item) ? item.to : undefined,
            category: item.category,
            ts: Date.now(),
          });
          if (isAction(item)) item.onSelect();
          else if (isRoute(item)) navigate(item.to);
        }
        return;
      }
      if (e.key === "Tab") {
        // Focus trap
        const root = panelRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, activeIndex, filtered, navigate]);

  // Keep the active item in view within the scroll container (minimal scroll)
  useEffect(() => {
    if (!open) return;
    const container = listRef.current;
    const el = document.getElementById(`cmd-item-${activeIndex}`);
    if (!container || !el) return;
    // Compute relative positions to container using offsets to avoid layout jumps
    const top = (el as HTMLElement).offsetTop - (container as HTMLElement).offsetTop;
    const bottom = top + (el as HTMLElement).offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (bottom > viewBottom) {
      // Scroll just enough so the item touches the bottom edge
      container.scrollTop = bottom - container.clientHeight;
    } else if (top < viewTop) {
      // Scroll just enough so the item touches the top edge
      container.scrollTop = top;
    }
    // If we're on the last item, ensure we reach the absolute bottom so the sentinel intersects
    if (activeIndex === filtered.length - 1) {
      container.scrollTop = container.scrollHeight - container.clientHeight;
    }
  }, [activeIndex, open, filtered.length]);

  // Observe the bottom sentinel to decide if more content exists below
  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    const target = bottomSentinelRef.current;
    if (!root || !target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isIntersecting = !!entry && entry.isIntersecting === true;
        setHasMoreBelow(!isIntersecting);
      },
      { root, threshold: 0, rootMargin: "0px 0px 2px 0px" }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [open, filtered.length]);

  // Observe the top sentinel to decide if more content exists above
  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    const target = topSentinelRef.current;
    if (!root || !target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isIntersecting = !!entry && entry.isIntersecting === true;
        setHasMoreAbove(!isIntersecting);
      },
      { root, threshold: 0, rootMargin: "2px 0px 0px 0px" }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [open, filtered.length]);

  // Pins set memoized; use pinsTick to trigger recompute and satisfy lint via explicit reference
  const pinsSet = useMemo(() => {
    void pinsTick; // ensures dependency is used
    return new Set(getPins());
  }, [pinsTick]);

  // Build grouped sections with Pinned first
  const sections = useMemo(() => {
    const pinnedItems = filtered.filter((i) => pinsSet.has(i.id));
    const rest = filtered.filter((i) => !pinsSet.has(i.id));
    const byCat = new Map<NavCategory, NavItem[]>();
    for (const it of rest) {
      const cat = (it as NavItemBase).category || "Apps";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(it);
    }
    const out: Array<{ category: string; items: NavItem[] }> = [];
    if (pinnedItems.length) out.push({ category: "Pinned", items: pinnedItems });
    for (const c of CATEGORY_ORDER)
      if (byCat.has(c)) out.push({ category: c, items: byCat.get(c)! });
    return out;
  }, [filtered, pinsSet]);

  type RenderRow =
    | { type: "header"; category: string }
    | { type: "item"; item: NavItem; idx: number };
  const rendered = useMemo(() => {
    const out: RenderRow[] = [];
    let idx = 0;
    for (const sec of sections) {
      out.push({ type: "header", category: sec.category });
      for (const it of sec.items) out.push({ type: "item", item: it, idx: idx++ });
    }
    return out;
  }, [sections]);

  // Virtualizer (must be a hook at component level)
  const virtualizer = useVirtualizer({
    count: rendered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 42,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Keep active item in view using the virtualizer
  useEffect(() => {
    if (!open) return;
    try {
      virtualizer.scrollToIndex(activeIndex, { align: "auto" as const });
    } catch {}
  }, [activeIndex, open, virtualizer]);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50">
      {/* Launcher (circular, matches AI widget size) */}
      {!open && (
        <button
          aria-label="Open Command Dock"
          className="group pointer-events-auto shadow-lg rounded-full w-20 h-20 flex items-center justify-center bg-[#f4f4f4] text-slate-900 border-2 border-[#75c29a] backdrop-blur-md transition-[colors,transform] duration-200 transform-gpu hover:bg-[#f4f4f4]/95 hover:shadow-2xl hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75c29a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          onClick={() => setOpen(true)}
          tabIndex={-1}
        >
          {dockLogoUrl ? (
            <img
              src={dockLogoUrl}
              alt="Command Dock"
              className="w-16 h-16 rounded-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
            />
          ) : (
            <Command className="h-10 w-10" />
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Command Dock"
          className="pointer-events-auto w-[420px] max-w-[92vw] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/95 text-white shadow-2xl backdrop-blur-xl"
          tabIndex={-1}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
            <Search className="h-4 w-4 text-white/70" />
            <input
              ref={inputRef}
              placeholder="Type to filter commands…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div
            role="listbox"
            aria-label="Commands"
            aria-activedescendant={filtered.length ? `cmd-item-${activeIndex}` : undefined}
            className="relative max-h-[60vh] overflow-y-auto"
            tabIndex={-1}
            ref={listRef}
            onMouseMove={() => {
              inputModeRef.current = "mouse";
            }}
            data-cmd-scroll
          >
            {/* Hide native scrollbar on the actual scroller */}
            <style>{`[data-cmd-scroll]::-webkit-scrollbar{display:none;}[data-cmd-scroll]{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
            {/* Top sentinel */}
            <div ref={topSentinelRef} aria-hidden="true" className="h-1 w-full opacity-0" />
            <div style={{ height: totalSize, position: "relative" }}>
              {virtualItems.map((vi: VirtualItem) => {
                const row = rendered[vi.index];
                if (!row) return null;
                const key = row.type === "header" ? `hdr-${row.category}-${vi.index}` : row.item.id;
                return (
                  <div
                    key={key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${vi.start}px)`,
                    }}
                  >
                    {row.type === "header" ? (
                      <div
                        role="separator"
                        className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/50"
                      >
                        {row.category}
                      </div>
                    ) : (
                      <button
                        id={`cmd-item-${row.idx}`}
                        role="option"
                        aria-selected={row.idx === activeIndex}
                        data-cmd-item
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 ring-white/30 ring-offset-1 ring-offset-slate-950/90 ${
                          row.idx === activeIndex
                            ? "bg-white/10 ring-1 ring-white/10"
                            : "hover:bg-white/5"
                        }`}
                        onMouseEnter={() => {
                          if (inputModeRef.current !== "mouse") return;
                          setActiveIndex(row.idx);
                        }}
                        onClick={() => {
                          setOpen(false);
                          const id = isRoute(row.item) ? row.item.to : row.item.label;
                          bumpRecent(id);
                          emit("select", {
                            id,
                            label: row.item.label,
                            to: isRoute(row.item) ? row.item.to : undefined,
                            category: row.item.category,
                            ts: Date.now(),
                          });
                          if (isAction(row.item)) {
                            row.item.onSelect();
                          } else if (isRoute(row.item)) {
                            navigate(row.item.to);
                          }
                        }}
                      >
                        <row.item.icon className="h-4 w-4 text-white/80" />
                        <span className="text-sm">{row.item.label}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Pin command"
                          className={`ml-auto ${pinsSet.has(row.item.id) ? "text-yellow-400" : "text-white/60 hover:text-white"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(row.item.id);
                            setPinsTick((t) => t + 1);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePin(row.item.id);
                              setPinsTick((t) => t + 1);
                            }
                          }}
                        >
                          <Star className="h-4 w-4" />
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-white/60">No results</div>
            )}
            {/* Bottom sentinel for IntersectionObserver */}
            <div ref={bottomSentinelRef} aria-hidden="true" className="h-1 w-full opacity-0" />
            {/* Up/Down chevrons */}
            <div
              className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-white/60 transition-opacity duration-200 ${hasMoreAbove ? "opacity-100" : "opacity-0"}`}
            >
              <ChevronUp className="h-4 w-4" />
            </div>
            <div
              className={`pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-white/60 transition-opacity duration-200 ${hasMoreBelow ? "opacity-100" : "opacity-0"}`}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
          <div className="px-4 py-2 text-[11px] text-white/70 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between gap-3 whitespace-nowrap overflow-hidden">
              <div className="flex items-center gap-2">
                <kbd className="bg-white/10 px-1 py-0.5 rounded">↑/↓</kbd>
                <span className="opacity-80">navigate</span>
                <span className="mx-1 opacity-30">•</span>
                <kbd className="bg-white/10 px-1 py-0.5 rounded">Enter</kbd>
                <span className="opacity-80">open</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-white/70 hover:text-white text-xs underline"
                  onClick={() => {
                    clearRecents();
                    setActiveIndex(0);
                    toast({ title: "Recents cleared" });
                  }}
                >
                  Clear recents
                </button>
                <span className="opacity-80">AI</span>
                <kbd className="bg-white/10 px-1 py-0.5 rounded">⌘/Ctrl L</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
