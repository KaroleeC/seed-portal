/**
 * Commissions Service
 *
 * DRY: Consolidates duplicate SQL queries from routes.ts
 * Provides a clean interface for commission data access.
 *
 * Before: Same SQL query repeated 3 times in routes
 * After: Single function with flexible filtering
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm";

export interface Commission {
  id: number;
  hubspot_invoice_id: string | null;
  sales_rep_id: number;
  commission_type: string;
  amount: number;
  status: string;
  month_number: number | null;
  service_type: string | null;
  date_earned: string | null;
  created_at: string;
  notes: string | null;
  company_name: string;
  sales_rep_name: string;
  service_names: string | null;
}

export interface CommissionFilters {
  salesRepId?: number;
  userId?: number;
  includeAll?: boolean; // For admin access
}

/**
 * Get commissions with flexible filtering
 *
 * DRY: Single SQL query used for all scenarios:
 * - Specific sales rep
 * - All commissions (admin)
 * - User's own commissions
 *
 * @param filters - Filter criteria
 * @returns Array of commissions
 */
export async function getCommissions(filters: CommissionFilters): Promise<Commission[]> {
  const { salesRepId, userId, includeAll } = filters;

  // Build WHERE clause based on filters
  let whereClause = sql`1=1`; // Default: no filter

  if (salesRepId) {
    whereClause = sql`c.sales_rep_id = ${salesRepId}`;
  } else if (userId && !includeAll) {
    whereClause = sql`sr.user_id = ${userId}`;
  }
  // If includeAll is true, no WHERE clause (admin gets all)

  const result = await db.execute(sql`
    SELECT 
      c.id,
      c.hubspot_invoice_id,
      c.sales_rep_id,
      c.type as commission_type,
      c.amount,
      c.status,
      c.month_number,
      c.service_type,
      c.date_earned,
      c.created_at,
      c.notes,
      COALESCE(hi.company_name, 'Unknown Company') as company_name,
      CONCAT(u.first_name, ' ', u.last_name) as sales_rep_name,
      string_agg(DISTINCT hil.name, ', ') as service_names
    FROM commissions c
    LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
    LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
    LEFT JOIN users u ON sr.user_id = u.id
    LEFT JOIN hubspot_invoice_line_items hil ON hi.id = hil.invoice_id
    WHERE ${whereClause}
    GROUP BY c.id, c.hubspot_invoice_id, c.sales_rep_id, c.type, c.amount, c.status, 
             c.month_number, c.service_type, c.date_earned, c.created_at, c.notes,
             hi.company_name, u.first_name, u.last_name
    ORDER BY c.created_at DESC
  `);

  return result.rows as Commission[];
}

/**
 * Get commission by ID
 *
 * @param id - Commission ID
 * @returns Commission or null
 */
export async function getCommissionById(id: number): Promise<Commission | null> {
  const result = await db.execute(sql`
    SELECT 
      c.id,
      c.hubspot_invoice_id,
      c.sales_rep_id,
      c.type as commission_type,
      c.amount,
      c.status,
      c.month_number,
      c.service_type,
      c.date_earned,
      c.created_at,
      c.notes,
      COALESCE(hi.company_name, 'Unknown Company') as company_name,
      CONCAT(u.first_name, ' ', u.last_name) as sales_rep_name,
      string_agg(DISTINCT hil.name, ', ') as service_names
    FROM commissions c
    LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
    LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
    LEFT JOIN users u ON sr.user_id = u.id
    LEFT JOIN hubspot_invoice_line_items hil ON hi.id = hil.invoice_id
    WHERE c.id = ${id}
    GROUP BY c.id, c.hubspot_invoice_id, c.sales_rep_id, c.type, c.amount, c.status, 
             c.month_number, c.service_type, c.date_earned, c.created_at, c.notes,
             hi.company_name, u.first_name, u.last_name
  `);

  return result.rows.length > 0 ? (result.rows[0] as Commission) : null;
}

/**
 * Update commission status
 *
 * @param id - Commission ID
 * @param status - New status
 * @returns Updated commission
 */
export async function updateCommissionStatus(
  id: number,
  status: string
): Promise<Commission | null> {
  const result = await db.execute(sql`
    UPDATE commissions
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `);

  if (result.rows.length === 0) {
    return null;
  }

  // Fetch full commission data with joins
  return getCommissionById(id);
}

/**
 * Update commission amount and notes
 *
 * @param id - Commission ID
 * @param amount - New amount
 * @param notes - New notes
 * @returns Updated commission
 */
export async function updateCommission(
  id: number,
  updates: { amount?: number; notes?: string }
): Promise<Commission | null> {
  const { amount, notes } = updates;

  if (amount !== undefined) {
    await db.execute(sql`
      UPDATE commissions
      SET amount = ${amount}, updated_at = NOW()
      WHERE id = ${id}
    `);
  }

  if (notes !== undefined) {
    await db.execute(sql`
      UPDATE commissions
      SET notes = ${notes}, updated_at = NOW()
      WHERE id = ${id}
    `);
  }

  return getCommissionById(id);
}

/**
 * Get commission adjustments for a sales rep
 *
 * @param salesRepId - Sales rep ID
 * @returns Array of adjustments
 */
export async function getCommissionAdjustments(salesRepId?: number) {
  const result = await db.execute(sql`
    SELECT 
      ca.id,
      ca.sales_rep_id,
      ca.amount,
      ca.reason,
      ca.created_at,
      ca.created_by_user_id,
      CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
      CONCAT(rep_user.first_name, ' ', rep_user.last_name) as sales_rep_name
    FROM commission_adjustments ca
    LEFT JOIN users creator ON ca.created_by_user_id = creator.id
    LEFT JOIN sales_reps sr ON ca.sales_rep_id = sr.id
    LEFT JOIN users rep_user ON sr.user_id = rep_user.id
    ${salesRepId ? sql`WHERE ca.sales_rep_id = ${salesRepId}` : sql``}
    ORDER BY ca.created_at DESC
  `);

  return result.rows;
}

/**
 * Group commissions by invoice
 *
 * DRY: Extracted from routes to be reusable
 *
 * @param commissions - Array of commissions
 * @returns Map of invoice groups
 */
export function groupCommissionsByInvoice(commissions: Commission[]): Map<string, any> {
  const invoiceGroups = new Map();

  commissions.forEach((comm) => {
    // Skip projection records from main commission tracking
    if (comm.commission_type === "projection") {
      return;
    }

    // Handle bonus records specially (they don't have invoice IDs)
    if (comm.commission_type === "monthly_bonus" || comm.commission_type === "milestone_bonus") {
      const bonusKey = `bonus_${comm.id}`;
      invoiceGroups.set(bonusKey, {
        id: comm.id,
        dealId: null,
        dealName: comm.notes || "Bonus Commission",
        dealAmount: comm.amount,
        companyName: comm.company_name || "N/A",
        commission: comm.amount,
        status: comm.status,
        date: comm.date_earned,
        salesRepId: comm.sales_rep_id,
        salesRepName: comm.sales_rep_name,
        type: comm.commission_type,
        monthNumber: comm.month_number,
        commissions: [comm],
      });
      return;
    }

    const invoiceId = comm.hubspot_invoice_id;
    if (!invoiceId) return;

    if (!invoiceGroups.has(invoiceId)) {
      invoiceGroups.set(invoiceId, {
        id: comm.id,
        dealId: invoiceId,
        dealName: comm.service_names || "Unknown Service",
        dealAmount: 0,
        companyName: comm.company_name,
        commission: 0,
        status: comm.status,
        date: comm.date_earned,
        salesRepId: comm.sales_rep_id,
        salesRepName: comm.sales_rep_name,
        type: "recurring",
        monthNumber: comm.month_number,
        commissions: [],
      });
    }

    const group = invoiceGroups.get(invoiceId);
    group.commission += comm.amount;
    group.commissions.push(comm);
  });

  return invoiceGroups;
}
