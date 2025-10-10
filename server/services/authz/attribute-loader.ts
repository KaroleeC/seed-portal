import { storage } from "../../storage";
import { safeDbQuery } from "../../db-utils";
import type { Principal, Resource } from "./authorize";
import type { CerbosPrincipal, CerbosResource } from "./cerbos-client";

/**
 * Enriched principal data from database
 */
export interface EnrichedPrincipalData {
  departments: string[];
  isManager: boolean;
  managerOfDepartmentIds: string[];
  managerOfUserIds: string[];
}

/**
 * Enriched resource data from database
 */
export interface EnrichedResourceData {
  ownerId?: number;
  ownerEmail?: string;
  departmentId?: string;
  departmentName?: string;
  status?: string;
  amount?: number;
  createdAt?: Date;
  [key: string]: any;
}

/**
 * Cache for attribute data to avoid repeated DB queries
 */
const attributeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Load and enrich principal with database attributes
 */
export async function loadPrincipalAttributes(
  principal: Principal
): Promise<EnrichedPrincipalData> {
  const cacheKey = `principal:${principal.userId}`;
  const cached = attributeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    console.log("🔍 [AttributeLoader] Loading principal attributes for user:", principal.userId);

    // Load user's departments
    const userDepartments = await storage.getUserDepartments(principal.userId);
    const departments = userDepartments.map((d) => d.name);

    // Check if user is a manager by looking at manager_edges
    const managerEdges =
      (await safeDbQuery(async () => {
        const { db } = await import("../../db");
        const { managerEdges, users } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");

        return await db
          .select({
            memberUserId: managerEdges.memberUserId,
            memberEmail: users.email,
          })
          .from(managerEdges)
          .innerJoin(users, eq(managerEdges.memberUserId, users.id))
          .where(eq(managerEdges.managerUserId, principal.userId));
      }, "loadManagerEdges")) || [];

    const isManager = managerEdges.length > 0;
    const managerOfUserIds = managerEdges.map((edge: any) => edge.memberUserId.toString());

    // Get departments this user manages (simplified - assume manager of users in same dept)
    const managerOfDepartmentIds: string[] = [];
    if (isManager) {
      // For now, assume manager manages their own departments
      // In a more complex setup, you'd have explicit manager-department relationships
      managerOfDepartmentIds.push(...departments);
    }

    const enrichedData: EnrichedPrincipalData = {
      departments,
      isManager,
      managerOfDepartmentIds,
      managerOfUserIds,
    };

    // Cache the result
    attributeCache.set(cacheKey, {
      data: enrichedData,
      timestamp: Date.now(),
    });

    console.log("✅ [AttributeLoader] Principal attributes loaded:", {
      userId: principal.userId,
      departments: departments.length,
      isManager,
      managesUsers: managerOfUserIds.length,
    });

    return enrichedData;
  } catch (error) {
    console.error("❌ [AttributeLoader] Failed to load principal attributes:", error);

    // Return safe defaults on error
    return {
      departments: [],
      isManager: false,
      managerOfDepartmentIds: [],
      managerOfUserIds: [],
    };
  }
}

/**
 * Load and enrich resource with database attributes
 */
export async function loadResourceAttributes(resource: Resource): Promise<EnrichedResourceData> {
  const cacheKey = `resource:${resource.type}:${resource.id}`;
  const cached = attributeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    console.log("🔍 [AttributeLoader] Loading resource attributes:", {
      type: resource.type,
      id: resource.id,
    });

    let enrichedData: EnrichedResourceData = { ...resource.attrs };

    // Resource-specific attribute loading
    switch (resource.type) {
      case "commission":
        enrichedData = await loadCommissionAttributes(resource, enrichedData);
        break;
      case "quote":
        enrichedData = await loadQuoteAttributes(resource, enrichedData);
        break;
      case "deal":
        enrichedData = await loadDealAttributes(resource, enrichedData);
        break;
      case "invoice":
        enrichedData = await loadInvoiceAttributes(resource, enrichedData);
        break;
      default:
        console.log("ℹ️ [AttributeLoader] No specific loader for resource type:", resource.type);
    }

    // Cache the result
    attributeCache.set(cacheKey, {
      data: enrichedData,
      timestamp: Date.now(),
    });

    return enrichedData;
  } catch (error) {
    console.error("❌ [AttributeLoader] Failed to load resource attributes:", error);
    return { ...resource.attrs };
  }
}

/**
 * Load commission-specific attributes
 */
async function loadCommissionAttributes(
  resource: Resource,
  baseData: EnrichedResourceData
): Promise<EnrichedResourceData> {
  if (!resource.id) return baseData;

  const commission = await safeDbQuery(async () => {
    const { db } = await import("../../db");
    const { commissions, users, deals } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [result] = await db
      .select({
        commission: commissions,
        ownerEmail: users.email,
        dealName: deals.dealName,
      })
      .from(commissions)
      .leftJoin(deals, eq(commissions.dealId, deals.id))
      .leftJoin(users, eq(deals.ownerId, users.id))
      .where(eq(commissions.id, parseInt(resource.id!.toString(), 10)));

    return result;
  }, "loadCommissionAttributes");

  if (commission) {
    return {
      ...baseData,
      ownerId: commission.commission.salesRepId,
      ownerEmail: commission.ownerEmail,
      status: commission.commission.status,
      amount: parseFloat(commission.commission.amount.toString()),
      dealName: commission.dealName,
      type: commission.commission.type,
      dateEarned: commission.commission.dateEarned,
    };
  }

  return baseData;
}

/**
 * Load quote-specific attributes
 */
async function loadQuoteAttributes(
  resource: Resource,
  baseData: EnrichedResourceData
): Promise<EnrichedResourceData> {
  if (!resource.id) return baseData;

  const quote = await storage.getQuote(parseInt(resource.id!.toString(), 10));
  if (quote) {
    return {
      ...baseData,
      ownerId: quote.ownerId,
      contactEmail: quote.contactEmail,
      companyName: quote.companyName,
      monthlyFee: parseFloat(quote.monthlyFee.toString()),
      setupFee: parseFloat(quote.setupFee.toString()),
      archived: quote.archived,
      approvalRequired: quote.approvalRequired,
      createdAt: quote.createdAt,
    };
  }

  return baseData;
}

/**
 * Load deal-specific attributes
 */
async function loadDealAttributes(
  resource: Resource,
  baseData: EnrichedResourceData
): Promise<EnrichedResourceData> {
  if (!resource.id) return baseData;

  const deal = await safeDbQuery(async () => {
    const { db } = await import("../../db");
    const { deals, users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [result] = await db
      .select({
        deal: deals,
        ownerEmail: users.email,
      })
      .from(deals)
      .leftJoin(users, eq(deals.ownerId, users.id))
      .where(eq(deals.id, parseInt(resource.id!.toString(), 10)));

    return result;
  }, "loadDealAttributes");

  if (deal) {
    return {
      ...baseData,
      ownerId: deal.deal.ownerId,
      ownerEmail: deal.ownerEmail,
      dealName: deal.deal.dealName,
      amount: parseFloat(deal.deal.amount.toString()),
      stage: deal.deal.stage,
      status: deal.deal.status,
      serviceType: deal.deal.serviceType,
      companyName: deal.deal.companyName,
      closedDate: deal.deal.closedDate,
    };
  }

  return baseData;
}

/**
 * Load invoice-specific attributes
 */
async function loadInvoiceAttributes(
  resource: Resource,
  baseData: EnrichedResourceData
): Promise<EnrichedResourceData> {
  if (!resource.id) return baseData;

  const invoice = await safeDbQuery(async () => {
    const { db } = await import("../../db");
    const { hubspotInvoices, salesReps, users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [result] = await db
      .select({
        invoice: hubspotInvoices,
        ownerEmail: users.email,
      })
      .from(hubspotInvoices)
      .leftJoin(salesReps, eq(hubspotInvoices.salesRepId, salesReps.id))
      .leftJoin(users, eq(salesReps.userId, users.id))
      .where(eq(hubspotInvoices.id, parseInt(resource.id!.toString(), 10)));

    return result;
  }, "loadInvoiceAttributes");

  if (invoice) {
    return {
      ...baseData,
      ownerId: invoice.invoice.salesRepId,
      ownerEmail: invoice.ownerEmail,
      status: invoice.invoice.status,
      totalAmount: parseFloat(invoice.invoice.totalAmount.toString()),
      paidAmount: parseFloat(invoice.invoice.paidAmount.toString()),
      invoiceDate: invoice.invoice.invoiceDate,
      dueDate: invoice.invoice.dueDate,
      companyName: invoice.invoice.companyName,
    };
  }

  return baseData;
}

/**
 * Clear attribute cache for a specific key or all keys
 */
export function clearAttributeCache(key?: string): void {
  if (key) {
    attributeCache.delete(key);
  } else {
    attributeCache.clear();
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getAttributeCacheStats(): {
  size: number;
  keys: string[];
  oldestEntry?: number;
  newestEntry?: number;
} {
  const entries = Array.from(attributeCache.entries());
  const timestamps = entries.map(([, value]) => value.timestamp);

  return {
    size: attributeCache.size,
    keys: entries.map(([key]) => key),
    oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
    newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
  };
}
