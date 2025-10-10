import { cache, CacheTTL, CachePrefix } from "../cache";
import { logger } from "../logger";
import type { Deal } from "@shared/deals";
import { hubSpotService } from "../hubspot";

interface DealsQuery {
  ids?: string[];
  ownerId?: string;
  limit?: number;
}

interface DealsResult {
  deals: Deal[];
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
}

class DealsService {
  private isDisabled(): boolean {
    return (
      process.env.DISABLE_CRM === "1" || (process.env.DISABLE_CRM || "").toLowerCase() === "true"
    );
  }

  private mapDeal(raw: any): Deal {
    const p = raw.properties || {};
    const parseTime = (v: any) => {
      if (!v) return null;
      const num = Number(v);
      if (Number.isFinite(num)) {
        try {
          return new Date(num).toISOString();
        } catch {
          return null;
        }
      }
      // Some HubSpot props can be ISO strings
      try {
        return new Date(v).toISOString();
      } catch {
        return null;
      }
    };

    return {
      id: String(raw.id),
      name: p.dealname ?? "",
      amount: p.amount ? Number(p.amount) : null,
      stage: p.dealstage ?? null,
      pipeline: p.pipeline ?? null,
      ownerId: p.hubspot_owner_id ?? null,
      companyId: raw.associations?.companies?.results?.[0]?.id ?? null,
      companyName: null, // optional enrichment later
      closeDate: parseTime(p.closedate),
      currency: p.hs_currency ?? null,
      createdAt: parseTime(p.createdate),
      updatedAt: parseTime(p.hs_lastmodifieddate),
      custom: {},
    };
  }

  private cacheKey(query: DealsQuery): string {
    const base = { ...query, ids: query.ids?.slice(0, 100) }; // keep key reasonable
    return cache.generateKey(CachePrefix.HUBSPOT_DEALS_LIST, base);
  }

  async getDeals(query: DealsQuery): Promise<DealsResult> {
    if (this.isDisabled()) {
      return {
        deals: [],
        status: "degraded",
        message: "CRM disabled via DISABLE_CRM",
      };
    }
    if (!hubSpotService) {
      return {
        deals: [],
        status: "degraded",
        message: "HubSpot integration not configured",
      };
    }

    const key = this.cacheKey(query);

    try {
      const cached = await cache.get<DealsResult>(key);
      if (cached) return cached;
    } catch {
      // ignore cache errors
    }

    try {
      const properties = [
        "dealname",
        "dealstage",
        "amount",
        "pipeline",
        "hubspot_owner_id",
        "closedate",
        "createdate",
        "hs_lastmodifieddate",
        "hs_currency",
      ];
      const limit = Math.min(Math.max(query.limit || 100, 1), 100);

      const raw = await hubSpotService.getDeals({
        ids: query.ids,
        ownerId: query.ownerId,
        limit,
        properties,
        associations: ["companies"],
      });
      const deals: Deal[] = (raw || []).map((r: any) => this.mapDeal(r));
      const payload: DealsResult = { deals, status: "healthy" };
      await cache.set(key, payload, CacheTTL.HUBSPOT_DEALS);
      return payload;
    } catch (error: any) {
      logger.error("DealsService.getDeals failed", { error: error.message });
      return { deals: [], status: "unhealthy", message: error.message };
    }
  }
}

export const dealsService = new DealsService();
