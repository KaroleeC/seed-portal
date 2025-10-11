/**
 * Email-Lead Linking API Routes
 * 
 * Endpoints for managing relationships between SEEDMAIL threads and LEADIQ leads
 */

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/supabase-auth";
import {
  autoLinkThreadToLeads,
  linkThreadToLead,
  unlinkThreadFromLead,
  getThreadLeads,
  getLeadThreads,
  findLeadsByEmail,
  syncLeadEmails,
} from "../../services/email-lead-linking.service";
import { logger } from "../../logger";

const router = Router();
const routeLogger = logger.child({ module: "email-lead-linking-routes" });

// Validation schemas
const LinkThreadToLeadSchema = z.object({
  threadId: z.string().min(1),
  leadId: z.string().min(1),
});

const UnlinkThreadFromLeadSchema = z.object({
  threadId: z.string().min(1),
  leadId: z.string().min(1),
});

const FindLeadsByEmailSchema = z.object({
  email: z.string().email(),
});

const AutoLinkThreadSchema = z.object({
  threadId: z.string().min(1),
});

const SyncLeadEmailsSchema = z.object({
  leadId: z.string().min(1),
});

/**
 * POST /api/email/lead-linking/link
 * Manually link a thread to a lead
 */
router.post("/link", requireAuth, async (req, res) => {
  try {
    const { threadId, leadId } = LinkThreadToLeadSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const link = await linkThreadToLead(threadId, leadId, userId, "manual");

    if (!link) {
      return res.status(500).json({ error: "Failed to create link" });
    }

    routeLogger.info({ threadId, leadId, userId }, "Thread linked to lead");

    res.json({ success: true, link });
  } catch (error) {
    routeLogger.error({ error }, "Failed to link thread to lead");
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    
    res.status(500).json({ error: "Failed to link thread to lead" });
  }
});

/**
 * POST /api/email/lead-linking/unlink
 * Unlink a thread from a lead
 */
router.post("/unlink", requireAuth, async (req, res) => {
  try {
    const { threadId, leadId } = UnlinkThreadFromLeadSchema.parse(req.body);

    const deleted = await unlinkThreadFromLead(threadId, leadId);

    if (!deleted) {
      return res.status(404).json({ error: "Link not found" });
    }

    routeLogger.info({ threadId, leadId }, "Thread unlinked from lead");

    res.json({ success: true });
  } catch (error) {
    routeLogger.error({ error }, "Failed to unlink thread from lead");
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    
    res.status(500).json({ error: "Failed to unlink thread from lead" });
  }
});

/**
 * POST /api/email/lead-linking/auto-link
 * Auto-link a thread to leads based on participant emails
 */
router.post("/auto-link", requireAuth, async (req, res) => {
  try {
    const { threadId } = AutoLinkThreadSchema.parse(req.body);

    const links = await autoLinkThreadToLeads(threadId);

    routeLogger.info({ threadId, linkCount: links.length }, "Auto-linked thread");

    res.json({ success: true, links });
  } catch (error) {
    routeLogger.error({ error }, "Failed to auto-link thread");
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    
    res.status(500).json({ error: "Failed to auto-link thread" });
  }
});

/**
 * GET /api/email/lead-linking/thread/:threadId/leads
 * Get all leads linked to a thread
 */
router.get("/thread/:threadId/leads", requireAuth, async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({ error: "Thread ID is required" });
    }

    const leadIds = await getThreadLeads(threadId);

    res.json({ leadIds });
  } catch (error) {
    routeLogger.error({ error }, "Failed to get thread leads");
    res.status(500).json({ error: "Failed to get thread leads" });
  }
});

/**
 * GET /api/email/lead-linking/lead/:leadId/threads
 * Get all threads linked to a lead
 */
router.get("/lead/:leadId/threads", requireAuth, async (req, res) => {
  try {
    const { leadId } = req.params;

    if (!leadId) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    const threadIds = await getLeadThreads(leadId);

    res.json({ threadIds });
  } catch (error) {
    routeLogger.error({ error }, "Failed to get lead threads");
    res.status(500).json({ error: "Failed to get lead threads" });
  }
});

/**
 * POST /api/email/lead-linking/find-by-email
 * Find leads matching an email address
 */
router.post("/find-by-email", requireAuth, async (req, res) => {
  try {
    const { email } = FindLeadsByEmailSchema.parse(req.body);

    const matches = await findLeadsByEmail(email);

    res.json({ matches });
  } catch (error) {
    routeLogger.error({ error }, "Failed to find leads by email");
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    
    res.status(500).json({ error: "Failed to find leads by email" });
  }
});

/**
 * POST /api/email/lead-linking/sync-lead-emails
 * Sync email addresses for a lead from contact/payload
 */
router.post("/sync-lead-emails", requireAuth, async (req, res) => {
  try {
    const { leadId } = SyncLeadEmailsSchema.parse(req.body);

    await syncLeadEmails(leadId);

    routeLogger.info({ leadId }, "Synced lead emails");

    res.json({ success: true });
  } catch (error) {
    routeLogger.error({ error }, "Failed to sync lead emails");
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    
    res.status(500).json({ error: "Failed to sync lead emails" });
  }
});

export default router;
