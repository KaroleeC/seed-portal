/**
 * Approval Codes Router
 *
 * Handles approval code generation and validation for cleanup overrides
 * and duplicate quote flows.
 *
 * Routes:
 * - POST /api/approval/request - Generate a new approval code
 * - POST /api/approval-request - Legacy alias for above
 * - POST /api/approval/validate - Validate an approval code
 */

import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { storage } from "../storage";
import { generateApprovalCode } from "../utils/approval";
import { sendSystemAlert } from "../slack";

const router = Router();

/**
 * POST /api/approval/request
 * Create an approval code for this contact email
 *
 * Used for cleanup override or duplicate quotes
 * Code expires in 30 minutes
 *
 * @body contactEmail - Email address to associate with code
 * @returns { success: true, code: string }
 */
router.post("/api/approval/request", requireAuth, async (req: any, res: Response) => {
  try {
    const contactEmail = (req.body?.contactEmail || req.body?.email || "").toString().trim();
    if (!contactEmail) {
      return res.status(400).json({ success: false, message: "contactEmail is required" });
    }

    // Generate and persist a 4‑digit approval code (expires in 30 minutes)
    const code = generateApprovalCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await storage.createApprovalCode({
      code,
      contactEmail,
      expiresAt,
    } as any);

    // Optional: notify admins in Slack
    try {
      await sendSystemAlert(
        "Approval code requested",
        `Contact: ${contactEmail}\nRequested by: ${req.user?.email}\nCode: ${code} (expires in 30m)`,
        "medium"
      );
    } catch (e) {
      console.warn("[Approval] Slack notification failed:", (e as any)?.message);
    }

    return res.json({ success: true, code });
  } catch (error) {
    console.error("[Approval] request error:", error);
    return res.status(500).json({ success: false, message: "Failed to create approval code" });
  }
});

/**
 * POST /api/approval-request
 * Legacy alias for /api/approval/request
 *
 * @deprecated Use /api/approval/request instead
 */
router.post("/api/approval-request", requireAuth, async (req: any, res: Response) => {
  // Delegate to the canonical endpoint logic
  try {
    const contactEmail = (req.body?.email || req.body?.contactEmail || "").toString().trim();
    if (!contactEmail) {
      return res.status(400).json({ success: false, message: "contactEmail is required" });
    }

    const code = generateApprovalCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await storage.createApprovalCode({
      code,
      contactEmail,
      expiresAt,
    } as any);

    try {
      await sendSystemAlert(
        "Approval code requested (legacy)",
        `Contact: ${contactEmail}\nRequested by: ${req.user?.email}\nCode: ${code} (expires in 30m)`,
        "medium"
      );
    } catch {
      // Ignore Slack errors
    }

    return res.json({ success: true, code });
  } catch (error) {
    console.error("[Approval] legacy request error:", error);
    return res.status(500).json({ success: false, message: "Failed to create approval code" });
  }
});

/**
 * POST /api/approval/validate
 * Validate a code without consuming it
 *
 * @body code - 4-digit approval code
 * @body contactEmail - Email associated with the code
 * @returns { valid: boolean, message: string }
 */
router.post("/api/approval/validate", requireAuth, async (req: Request, res: Response) => {
  try {
    const code = (req.body?.code || "").toString().trim();
    const contactEmail = (req.body?.contactEmail || req.body?.email || "").toString().trim();

    if (!code || !contactEmail) {
      return res.status(400).json({
        valid: false,
        message: "code and contactEmail are required",
      });
    }

    const valid = await storage.validateApprovalCode(code, contactEmail);
    return res.json({
      valid,
      message: valid ? "OK" : "Invalid or expired approval code",
    });
  } catch (error) {
    console.error("[Approval] validate error:", error);
    return res.status(500).json({ valid: false, message: "Validation failed" });
  }
});

export default router;
