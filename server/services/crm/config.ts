/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../db";
import { cache, CacheTTL } from "../../cache";
import { sql } from "drizzle-orm";

export interface LeadStage {
  id: string;
  name: string;
  order: number;
}

export interface LeadConfig {
  sources: string[]; // canonical keys e.g. ['facebook', 'zapier']
  statuses: string[]; // ['new', 'validated', ...]
  stages: string[]; // ['unassigned', 'assigned', ...] - for backward compatibility
  stagesDetailed?: LeadStage[]; // Full stage objects with id/name/order
}

const DEFAULT_CONFIG: LeadConfig = {
  sources: ["facebook", "leadexec", "zapier", "manual", "other"],
  statuses: ["new", "validated", "assigned", "disqualified"],
  stages: [
    "unassigned",
    "assigned",
    "contact_made",
    "discovery_booked",
    "quoted",
    "closed_won",
    "closed_lost",
  ],
};

function toKeyArray(rows: any[] | undefined, keyField = "key"): string[] | undefined {
  if (!rows || !rows.length) return undefined;
  const out = rows
    .filter((r) => r && (r[keyField] || r["key"]))
    .map((r) =>
      String(r[keyField] ?? r["key"])
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
  return out.length ? out : undefined;
}

const CACHE_KEY = "cache:crm:leadconfig:v1";

export async function getLeadConfig(): Promise<LeadConfig> {
  // Cache for 10 minutes under deterministic key
  const cached = await cache.get<LeadConfig>(CACHE_KEY);
  if (cached) return cached;

  if (!db) return DEFAULT_CONFIG;

  try {
    // Check if dynamic tables exist; if not, fall back.
    // We use raw SQL to avoid needing schema types.
    const sourcesRes: any = await (db as any)
      .execute(
        sql`SELECT key, label, is_active FROM crm_lead_sources WHERE is_active = true ORDER BY sort_order NULLS LAST, key ASC`
      )
      .catch(() => undefined);
    const statusesRes: any = await (db as any)
      .execute(
        sql`SELECT key, label, is_active FROM crm_lead_statuses WHERE is_active = true ORDER BY sort_order NULLS LAST, key ASC`
      )
      .catch(() => undefined);
    const stagesRes: any = await (db as any)
      .execute(
        sql`SELECT key, label, is_active, sort_order FROM crm_lead_stages WHERE is_active = true ORDER BY sort_order NULLS LAST, key ASC`
      )
      .catch(() => undefined);

    const stagesDetailed: LeadStage[] = ((stagesRes as any)?.rows || [])
      .filter((r: any) => r && r.key)
      .map((r: any, idx: number) => ({
        id: String(r.key).trim().toLowerCase(),
        name: r.label || r.key,
        order: r.sort_order ?? idx,
      }));

    console.log("[LeadConfig] Stages from DB:", {
      rowCount: (stagesRes as any)?.rows?.length,
      stagesDetailedCount: stagesDetailed.length,
      stagesDetailed,
    });

    const cfg: LeadConfig = {
      sources: toKeyArray((sourcesRes as any)?.rows) ?? DEFAULT_CONFIG.sources,
      statuses: toKeyArray((statusesRes as any)?.rows) ?? DEFAULT_CONFIG.statuses,
      stages: toKeyArray((stagesRes as any)?.rows) ?? DEFAULT_CONFIG.stages,
      stagesDetailed: stagesDetailed.length > 0 ? stagesDetailed : undefined,
    };

    // Use shorter cache in dev for config changes to reflect quickly
    const ttl = process.env.NODE_ENV === "production" ? CacheTTL.FIFTEEN_MINUTES : 60; // 1 minute in dev
    await cache.set(CACHE_KEY, cfg, ttl);
    return cfg;
  } catch {
    return DEFAULT_CONFIG; // never crash if tables are missing
  }
}

export async function invalidateLeadConfigCache(): Promise<void> {
  try {
    await cache.del(CACHE_KEY);
  } catch {}
}
