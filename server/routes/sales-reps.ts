/**
 * Sales Reps Router
 *
 * Handles sales representative management and bonus tracking.
 *
 * Routes:
 * - GET /api/sales-reps - List all active sales reps
 * - GET /api/sales-reps/me - Get current user's sales rep profile
 * - GET /api/monthly-bonuses - Get monthly bonuses for a sales rep
 * - GET /api/milestone-bonuses - Get milestone bonuses for a sales rep
 */

import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

/**
 * GET /api/sales-reps
 * Get all active sales reps with user details
 *
 * @returns Array of sales reps with name, email, HubSpot ID
 */
router.get("/api/sales-reps", requireAuth, async (req: any, res: Response) => {
  console.log("🚨 SALES REPS API CALLED - Starting execution");

  try {
    console.log("📊 Sales reps API called by user:", req.user?.email);

    // Test database connection
    console.log("🔍 Testing database connection...");
    const testResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`
    );
    console.log("📊 Sales reps count:", testResult.rows);

    // Join users to include name/email and HubSpot owner mapping
    const result = await db.execute(sql`
      SELECT 
        sr.id,
        sr.is_active,
        u.first_name,
        u.last_name,
        u.email,
        u.hubspot_user_id
      FROM sales_reps sr
      JOIN users u ON u.id = sr.user_id
      WHERE sr.is_active = true
      ORDER BY sr.id ASC
    `);

    console.log("📊 Raw sales reps from DB:", result.rows);

    // Transform to match expected frontend structure
    const salesReps = result.rows.map((rep: any) => ({
      id: rep.id,
      name: `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim(),
      email: rep.email,
      isActive: rep.is_active,
      hubspotUserId: rep.hubspot_user_id || null,
    }));

    // TODO: Bonus tracking integration temporarily disabled until schema is updated
    // Check and award bonuses for eligible reps (run in background)
    // try {
    //   const { bonusTrackingService } = await import('./services/bonus-tracking.js');
    //   const currentMonth = new Date().toISOString().slice(0, 7);
    //
    //   // TODO: For now using placeholder values since client count columns need to be added to sales_reps table
    //   const repMetrics = result.rows.map((rep: any) => ({
    //     salesRepId: rep.id,
    //     salesRepName: `${rep.first_name} ${rep.last_name}`,
    //     clientsClosedThisMonth: 0, // TODO: Calculate from actual commission data
    //     totalClientsAllTime: 0, // TODO: Calculate from actual commission data
    //     currentMonth
    //   }));

    //   // Award bonuses in background (don't wait for completion)
    //   bonusTrackingService.checkAndAwardMonthlyBonuses(repMetrics).catch(error => {
    //     console.error('Background bonus tracking error:', error);
    //   });
    //
    //   bonusTrackingService.checkAndAwardMilestoneBonuses(repMetrics).catch(error => {
    //     console.error('Background milestone tracking error:', error);
    //   });
    // } catch (bonusError) {
    //   console.error('Bonus service error (non-blocking):', bonusError);
    // }

    console.log("📊 Transformed sales reps:", salesReps);
    console.log("🚨 RETURNING DATA:", JSON.stringify(salesReps));
    res.json(salesReps);
  } catch (error) {
    console.error("🚨 ERROR in sales reps API:", error);
    res.status(500).json({
      message: "Failed to fetch sales reps",
      error: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/sales-reps/me
 * Get current user's sales rep profile
 *
 * @returns Sales rep profile or null
 */
router.get("/api/sales-reps/me", requireAuth, async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const salesRep = await storage.getSalesRepByUserId(req.user.id);
    res.json(salesRep || null);
  } catch (error) {
    console.error("Error fetching current sales rep:", error);
    res.status(500).json({ message: "Failed to fetch sales rep profile" });
  }
});

/**
 * GET /api/monthly-bonuses
 * Get monthly bonuses for a sales rep
 *
 * @query salesRepId - Optional sales rep ID filter (admin only for other reps)
 * @returns Array of monthly bonuses
 */
router.get("/api/monthly-bonuses", requireAuth, async (req: any, res: Response) => {
  try {
    const { salesRepId } = req.query;

    let bonuses: any[];
    if (salesRepId) {
      bonuses = await storage.getMonthlyBonusesBySalesRep(parseInt(salesRepId as string));
    } else {
      // If no specific sales rep, try to get for current user
      const salesRep = await storage.getSalesRepByUserId(req.user!.id);
      if (salesRep) {
        bonuses = await storage.getMonthlyBonusesBySalesRep(salesRep.id);
      } else {
        bonuses = [];
      }
    }

    res.json(bonuses);
  } catch (error) {
    console.error("Error fetching monthly bonuses:", getErrorMessage(error));
    res.status(500).json({ message: "Failed to fetch monthly bonuses" });
  }
});

/**
 * GET /api/milestone-bonuses
 * Get milestone bonuses for a sales rep
 *
 * @query salesRepId - Optional sales rep ID filter (admin only for other reps)
 * @returns Array of milestone bonuses
 */
router.get("/api/milestone-bonuses", requireAuth, async (req: any, res: Response) => {
  try {
    const { salesRepId } = req.query;

    let bonuses: any[];
    if (salesRepId) {
      bonuses = await storage.getMilestoneBonusesBySalesRep(parseInt(salesRepId as string));
    } else {
      // If no specific sales rep, try to get for current user
      const salesRep = await storage.getSalesRepByUserId(req.user!.id);
      if (salesRep) {
        bonuses = await storage.getMilestoneBonusesBySalesRep(salesRep.id);
      } else {
        bonuses = [];
      }
    }

    res.json(bonuses);
  } catch (error) {
    console.error("Error fetching milestone bonuses:", getErrorMessage(error));
    res.status(500).json({ message: "Failed to fetch milestone bonuses" });
  }
});

export default router;
