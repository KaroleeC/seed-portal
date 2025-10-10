/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../db";
import { crmDeals, crmContacts } from "@shared/schema";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { cache, CacheTTL } from "../../cache";
import { CRMDealSchema, type CRMDeal } from "@shared/contracts";

export interface PipelineFilters {
  pipeline?: string;
  stage?: string;
  ownerId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function toDeal(row: any): CRMDeal {
  const d: CRMDeal = {
    id: String(row.id),
    contactId: row.contactId ?? null,
    name: row.name ?? "",
    stage: row.stage ?? null,
    pipeline: row.pipeline ?? null,
    amount: row.amount != null ? Number(row.amount) : null,
    closeDate: row.closeDate ? new Date(row.closeDate).toISOString() : null,
    ownerId: row.ownerId ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  } as any;
  const safe = CRMDealSchema.safeParse(d);
  return (safe.success ? safe.data : d) as CRMDeal;
}

export async function listPipelineDeals(
  filters: PipelineFilters
): Promise<{ deals: CRMDeal[]; total: number }> {
  const { pipeline, stage, ownerId, q, limit = 20, offset = 0 } = filters;
  const cacheKey = cache.generateKey("crm:pipeline:list", {
    pipeline,
    stage,
    ownerId,
    q,
    limit,
    offset,
  });
  return await cache.wrap(
    cacheKey,
    async () => {
      const whereClauses: any[] = [];
      if (pipeline) whereClauses.push(eq(crmDeals.pipeline, pipeline));
      if (stage) whereClauses.push(eq(crmDeals.stage, stage));
      if (ownerId) whereClauses.push(eq(crmDeals.ownerId, ownerId));

      let searchClause: any = null;
      if (q && q.trim().length) {
        const term = `%${q.trim()}%`;
        searchClause = or(
          like(crmContacts.email, term),
          like(crmContacts.firstName, term),
          like(crmContacts.lastName, term),
          like(crmContacts.companyName, term),
          like(crmDeals.name, term)
        );
      }

      const mergedWhere = whereClauses.length
        ? searchClause
          ? and(...whereClauses, searchClause)
          : and(...whereClauses)
        : searchClause || undefined;

      let rowsQuery = db
        .select({
          id: crmDeals.id,
          contactId: crmDeals.contactId,
          name: crmDeals.name,
          stage: crmDeals.stage,
          pipeline: crmDeals.pipeline,
          amount: crmDeals.amount,
          closeDate: crmDeals.closeDate,
          ownerId: crmDeals.ownerId,
          createdAt: crmDeals.createdAt,
          updatedAt: crmDeals.updatedAt,
        })
        .from(crmDeals)
        .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id));
      if (mergedWhere) {
        rowsQuery = (rowsQuery as any).where(mergedWhere as any);
      }

      const rows = await (rowsQuery as any)
        .orderBy(desc(crmDeals.updatedAt))
        .limit(limit)
        .offset(offset);

      let countQuery = db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(crmDeals)
        .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id));
      if (mergedWhere) {
        countQuery = (countQuery as any).where(mergedWhere as any);
      }
      const [{ count }] = await (countQuery as any);

      const deals = (rows || []).map(toDeal);
      return { deals, total: Number(count || deals.length) };
    },
    { ttl: CacheTTL.TEN_MINUTES }
  );
}

export async function getPipelineSummary(filters: { pipeline?: string; ownerId?: string }) {
  const { pipeline, ownerId } = filters;
  const cacheKey = cache.generateKey("crm:pipeline:summary", { pipeline, ownerId });
  return await cache.wrap(
    cacheKey,
    async () => {
      const whereClauses: any[] = [];
      if (pipeline) whereClauses.push(eq(crmDeals.pipeline, pipeline));
      if (ownerId) whereClauses.push(eq(crmDeals.ownerId, ownerId));
      const mergedWhere = whereClauses.length ? and(...whereClauses) : undefined;

      let summaryQuery = db
        .select({
          stage: crmDeals.stage,
          count: sql<number>`cast(count(*) as int)` as any,
          amount: sql<string>`coalesce(sum(${crmDeals.amount}), '0')` as any,
        })
        .from(crmDeals)
        .groupBy(crmDeals.stage);
      if (mergedWhere) summaryQuery = (summaryQuery as any).where(mergedWhere as any);

      const rows = await (summaryQuery as any);

      const byStage: Record<string, { count: number; amount: number }> = {};
      let total = 0;
      let totalAmount = 0;
      for (const r of rows) {
        const stageKey = r.stage || "unknown";
        const cnt = Number(r.count || 0);
        const amt = Number(r.amount || 0);
        byStage[stageKey] = { count: cnt, amount: amt };
        total += cnt;
        totalAmount += amt;
      }

      return { byStage, total, totalAmount };
    },
    { ttl: CacheTTL.TEN_MINUTES }
  );
}
