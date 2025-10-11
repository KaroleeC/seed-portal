/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/supabase-auth";
import { searchRateLimit, apiRateLimit } from "../middleware/rate-limiter";
import { verifyWebhookSecret } from "../middleware/verify-webhook-secret";
import { searchContacts, getContactDetails } from "../services/crm/profiles";
import { listLeads, getLead, ingestZapierLead } from "../services/crm/leads";
import { listPipelineDeals, getPipelineSummary } from "../services/crm/pipeline";
import {
  ContactSearchResultSchema,
  ContactDetailsSchema,
  LeadsListResultSchema,
  CRMLeadSchema,
  CRMDealSchema,
} from "@shared/contracts";
import { z as zod } from "zod";
import { getLeadConfig } from "../services/crm/config";
import { createNote } from "../services/crm/notes";
import { createTask, updateTask } from "../services/crm/tasks";
import {
  storeOutboundMessage,
  storeInboundMessage,
  findOrCreateContactByEmail,
  findOrCreateContactByPhone,
  generateThreadKey,
  handleContactedStopConditions,
} from "../services/crm/messages";
import { sendEmail, parseInboundEmail } from "../services/email-provider";
import { sendSMS, parseInboundSMS } from "../services/sms-provider";
import { initiateVoiceCall } from "../services/voice-provider";
import { db } from "../db";
import { sql, eq, desc } from "drizzle-orm";
import { crmLeads } from "@shared/schema";
import { enqueueLeadAssigned } from "../services/cadence/events";
import { logger } from "../logger";

const router = Router();

// Debug: Log when this module is loaded
logger.info("[CRM Routes] Module loaded and router initialized");

// GET /api/crm/contacts/search?q=&limit=&offset=
router.get("/api/crm/contacts/search", requireAuth, searchRateLimit, async (req, res) => {
  const schema = z.object({
    q: z.string().min(1),
    limit: z.string().optional(),
    offset: z.string().optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
  }

  const q = parsed.data.q.trim();
  const limit = parsed.data.limit ? Math.min(parseInt(parsed.data.limit, 10) || 20, 50) : 20;
  const offset = parsed.data.offset ? Math.max(parseInt(parsed.data.offset, 10) || 0, 0) : 0;

  try {
    const result = await searchContacts({ q, limit, offset });
    const safe = ContactSearchResultSchema.safeParse(result);
    if (!safe.success) {
      return res.status(500).json({ message: "Invalid search payload" });
    }
    return res.json(safe.data);
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] search error");
    return res.status(500).json({ message: "Search failed" });
  }
});

// GET /api/crm/contacts/:id/lead — fetch most recent active lead for contact
router.get("/api/crm/contacts/:id/lead", requireAuth, async (req: Request, res: Response) => {
  const contactId = String(req.params.id || "");
  if (!contactId) return res.status(400).json({ message: "id is required" });
  try {
    const [row] = await db
      .select({ id: crmLeads.id })
      .from(crmLeads)
      .where(eq(crmLeads.contactId, contactId))
      .orderBy(desc(crmLeads.updatedAt))
      .limit(1);
    if (!row) return res.status(404).json({ message: "No lead found" });
    const lead = await getLead(String(row.id));
    if (!lead) return res.status(404).json({ message: "No lead found" });
    const safe = CRMLeadSchema.safeParse(lead);
    return res.json(safe.success ? safe.data : lead);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to fetch lead";
    return res.status(500).json({ message: msg });
  }
});

// =============================
// M1: Read-only CRM lead config for FE
// =============================
router.get("/api/crm/lead-config", requireAuth, async (req: Request, res: Response) => {
  try {
    const cfg = await getLeadConfig();
    // Role gating: sales reps shouldn't see 'unassigned' stage option
    const role = String(
      (req as any).user?.role || (req as any).principal?.role || ""
    ).toLowerCase();
    const isPrivileged = role === "admin" || role === "manager";
    const filtered = {
      ...cfg,
      stages: isPrivileged
        ? cfg.stages
        : (cfg.stages || []).filter((s: string) => s !== "unassigned"),
    };
    return res.json(filtered);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to load config";
    return res.status(500).json({ message: msg });
  }
});

// =============================
// M2: Core CRM actions
// =============================

// Helper to resolve assignee (id or email) to users.id string
async function resolveAssigneeRef(userRef?: string | null): Promise<string | null> {
  const s = String(userRef ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const rows: any = await (db as any).execute(
      sql`SELECT id FROM users WHERE id = ${parseInt(s, 10)} LIMIT 1`
    );
    if ((rows as any)?.rows?.[0]?.id) return String((rows as any).rows[0].id);
    throw new Error("assignedTo user id not found");
  }
  if (s.includes("@")) {
    const emailLc = s.toLowerCase();
    const rows: any = await (db as any).execute(
      sql`SELECT id FROM users WHERE lower(email) = ${emailLc} LIMIT 1`
    );
    if ((rows as any)?.rows?.[0]?.id) return String((rows as any).rows[0].id);
    throw new Error("assignedTo email not recognized");
  }
  throw new Error("assignedTo must be a user id or email");
}

// PATCH /api/crm/leads/:id — status/stage/assignedTo/source
router.patch("/api/crm/leads/:id", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  const { status, stage, assignedTo, source } = req.body || {};
  try {
    // Load existing lead to detect assignment transitions
    const [existingRow] = await db
      .select({ assignedTo: crmLeads.assignedTo })
      .from(crmLeads)
      .where(eq(crmLeads.id, id))
      .limit(1);
    const prevAssignedTo: string | null = (existingRow as any)?.assignedTo ?? null;

    const cfg = await getLeadConfig();
    const norm = (val: string | undefined, allowed: string[], fallback?: string) => {
      if (!val) return undefined;
      const s = String(val).trim().toLowerCase();
      return allowed.includes(s) ? s : fallback;
    };
    const statusNorm = norm(
      status,
      cfg.statuses.map((x) => x.toLowerCase())
    );
    const stageNorm = norm(
      stage,
      cfg.stages.map((x) => x.toLowerCase())
    );
    let sourceNorm = norm(
      source,
      cfg.sources.map((x) => x.toLowerCase())
    );
    if (!sourceNorm && typeof source === "string") {
      const s = source.toLowerCase();
      if (["fb", "facebook ads", "meta"].includes(s) && cfg.sources.includes("facebook"))
        sourceNorm = "facebook";
    }
    const assigneeId = assignedTo !== undefined ? await resolveAssigneeRef(assignedTo) : undefined;

    // Build partial update
    const set: any = {};
    if (statusNorm) set.status = statusNorm;
    if (stageNorm) set.stage = stageNorm;
    if (sourceNorm) set.source = sourceNorm;
    if (assignedTo !== undefined) set.assignedTo = assigneeId ?? null;
    if (Object.keys(set).length === 0) return res.json(await getLead(id));

    await (db as any)
      .update(crmLeads)
      .set({ ...set, updatedAt: new Date() } as any)
      .where(eq(crmLeads.id as any, id as any));

    // Trigger cadence on lead_assigned (null -> value)
    const newAssignedTo: string | null =
      assignedTo !== undefined ? await resolveAssigneeRef(assignedTo) : (undefined as any);
    if (assignedTo !== undefined) {
      const wasUnassigned = !prevAssignedTo;
      const isAssignedNow = !!(newAssignedTo || null);
      if (wasUnassigned && isAssignedNow) {
        try {
          await enqueueLeadAssigned({
            leadId: id,
            assignedTo: newAssignedTo || undefined,
            triggerAt: new Date(),
          });
        } catch (e) {
          logger.warn({ err: e }, "[Cadence] enqueue lead_assigned failed");
        }
      }
    }
    const updated = await getLead(id);
    if (!updated) return res.status(404).json({ message: "Lead not found" });
    const safe = CRMLeadSchema.safeParse(updated);
    return res.json(safe.success ? safe.data : updated);
  } catch (error: unknown) {
    const status =
      typeof (error as { status?: unknown })?.status === "number"
        ? (error as { status?: number }).status || 400
        : 400;
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to update lead";
    return res.status(status).json({ message: msg });
  }
});

// POST /api/crm/contacts/:id/notes
router.post("/api/crm/contacts/:id/notes", requireAuth, async (req: Request, res: Response) => {
  const contactId = String(req.params.id || "");
  const body = String(req.body?.body || "").trim();
  if (!contactId || !body)
    return res.status(400).json({ message: "contactId and body are required" });
  try {
    const authorId = String(req.user?.id || "");
    if (!authorId) return res.status(401).json({ message: "Authentication required" });
    const note = await createNote({ contactId, authorId, body });
    return res.json(note);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to create note";
    return res.status(500).json({ message: msg });
  }
});

// POST /api/crm/contacts/:id/tasks
router.post("/api/crm/contacts/:id/tasks", requireAuth, async (req: Request, res: Response) => {
  const contactId = String(req.params.id || "");
  const title = String(req.body?.title || "").trim();
  if (!contactId || !title)
    return res.status(400).json({ message: "contactId and title are required" });
  try {
    const task = await createTask({
      contactId,
      title,
      assigneeId: req.body?.assigneeId ?? null,
      dueDate: req.body?.dueDate ?? null,
    });
    return res.json(task);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to create task";
    return res.status(400).json({ message: msg });
  }
});

// PATCH /api/crm/tasks/:id
router.patch("/api/crm/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const task = await updateTask({
      id,
      title: req.body?.title,
      status: req.body?.status,
      assigneeId: req.body?.assigneeId,
      dueDate: req.body?.dueDate,
    });
    if (!task) return res.status(404).json({ message: "Task not found or no changes" });
    return res.json(task);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to update task";
    return res.status(400).json({ message: msg });
  }
});

// GET /api/crm/contacts/:id/timeline — basic timeline payload
router.get("/api/crm/contacts/:id/timeline", requireAuth, async (req: Request, res: Response) => {
  try {
    const details = await getContactDetails(String(req.params.id || ""));
    if (!details) return res.status(404).json({ message: "Contact not found" });
    return res.json({
      notes: details.notes || [],
      tasks: details.tasks || [],
      messages: details.messages || [],
    });
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to load timeline";
    return res.status(500).json({ message: msg });
  }
});

// =============================
// Zapier Intake Webhook
// =============================
// POST /api/crm/intake/zapier
// Secret-protected endpoint to ingest leads from Zapier "Webhooks by Zapier"
router.post("/api/crm/intake/zapier", apiRateLimit, verifyWebhookSecret, async (req, res) => {
  // Accept flexible payload and validate minimal shape
  const IntakeSchema = z
    .object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyName: z.string().optional(),
      phone: z.string().optional(),
      assignedTo: z.string().nullable().optional(),
      source: z.string().optional(),
      status: z.string().optional(),
      stage: z.string().optional(),
    })
    .passthrough();

  const parsed = IntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
  }

  try {
    const idempotencyKey = String(req.header("X-Idempotency-Key") || "").trim() || undefined;
    const result = await ingestZapierLead(parsed.data as any, idempotencyKey);
    return res.json({ status: "ok", lead: result });
  } catch (error: any) {
    const status = error?.status || 500;
    logger.error({ err: error }, "[CRM] Zapier intake error");
    return res.status(status).json({ message: error?.message || "Failed to ingest lead" });
  }
});

// =============================
// Pipeline
// =============================

// GET /api/crm/pipeline?pipeline=&stage=&ownerId=&q=&limit=&offset=
router.get("/api/crm/pipeline", requireAuth, searchRateLimit, async (req, res) => {
  const qschema = z.object({
    pipeline: z.string().optional(),
    stage: z.string().optional(),
    ownerId: z.string().optional(),
    q: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  });
  const parsed = qschema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
  }
  const { pipeline, stage, ownerId, q } = parsed.data;
  const limit = parsed.data.limit ? Math.min(parseInt(parsed.data.limit, 10) || 20, 100) : 20;
  const offset = parsed.data.offset ? Math.max(parseInt(parsed.data.offset, 10) || 0, 0) : 0;

  try {
    const result = await listPipelineDeals({ pipeline, stage, ownerId, q, limit, offset });
    const Envelope = zod.object({ deals: zod.array(CRMDealSchema), total: z.number() });
    const safe = Envelope.safeParse(result);
    if (!safe.success) return res.status(500).json({ message: "Invalid pipeline payload" });
    return res.json(safe.data);
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] pipeline list error");
    return res.status(500).json({ message: "Failed to fetch pipeline" });
  }
});

// GET /api/crm/pipeline/summary?pipeline=&ownerId=
router.get("/api/crm/pipeline/summary", requireAuth, searchRateLimit, async (req, res) => {
  const qschema = z.object({
    pipeline: z.string().optional(),
    ownerId: z.string().optional(),
  });
  const parsed = qschema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
  }
  try {
    const summary = await getPipelineSummary({
      pipeline: parsed.data.pipeline,
      ownerId: parsed.data.ownerId,
    });
    return res.json(summary);
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] pipeline summary error");
    return res.status(500).json({ message: "Failed to fetch pipeline summary" });
  }
});

// =============================
// Leads
// =============================

// GET /api/crm/leads?status=&stage=&assignedTo=&ownerId=&source=&q=&limit=&offset=
// Note: ownerId is an alias for assignedTo for frontend convenience
router.get("/api/crm/leads", requireAuth, searchRateLimit, async (req, res) => {
  const qschema = z.object({
    status: z.string().optional(),
    stage: z.string().optional(),
    assignedTo: z.string().optional(),
    ownerId: z.string().optional(), // Alias for assignedTo
    source: z.string().optional(),
    q: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  });

  const parsed = qschema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", errors: parsed.error.errors });
  }

  const { status, stage, assignedTo, ownerId, source, q } = parsed.data;
  // Role gating: non-admin/manager can only view their assigned leads
  const role = String((req as any).user?.role || (req as any).principal?.role || "").toLowerCase();
  const userId = (req as any).user?.id || (req as any).principal?.userId;
  const isPrivileged = role === "admin" || role === "manager";
  // Use ownerId as alias for assignedTo if provided, then override for non-privileged
  const assignedToFinal = isPrivileged ? assignedTo || ownerId : String(userId || "");
  const limit = parsed.data.limit ? Math.min(parseInt(parsed.data.limit, 10) || 20, 50) : 20;
  const offset = parsed.data.offset ? Math.max(parseInt(parsed.data.offset, 10) || 0, 0) : 0;

  try {
    const result = await listLeads({
      status: isPrivileged ? status : undefined,
      stage,
      assignedTo: assignedToFinal || undefined,
      source,
      q,
      limit,
      offset,
    });
    const safe = LeadsListResultSchema.safeParse(result);
    if (!safe.success) return res.status(500).json({ message: "Invalid leads payload" });
    return res.json(safe.data);
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] leads list error");
    return res.status(500).json({ message: "Failed to fetch leads" });
  }
});

// GET /api/crm/leads/emails - Get all lead email addresses for filtering
// MUST come before /api/crm/leads/:id to avoid matching "emails" as an ID
router.get("/api/crm/leads/emails", requireAuth, async (req, res) => {
  try {
    // Query all leads - just get payload which contains email
    const leads = await db
      .select({
        payload: crmLeads.payload,
        contactId: crmLeads.contactId,
      })
      .from(crmLeads);

    // Collect all unique emails from payload
    const emailSet = new Set<string>();
    
    for (const lead of leads) {
      // Get email from payload.email
      const payloadEmail = (lead.payload as any)?.email;
      if (payloadEmail && typeof payloadEmail === 'string') {
        emailSet.add(payloadEmail.toLowerCase());
      }
    }
    
    // If we need contact emails too, query them separately for leads with contactId
    const contactIds = leads
      .map(l => l.contactId)
      .filter((id): id is string => id !== null && id !== undefined);
    
    if (contactIds.length > 0) {
      const { crmContacts } = await import("@shared/schema");
      const { inArray } = await import("drizzle-orm");
      
      const contacts = await db
        .select({ email: crmContacts.email })
        .from(crmContacts)
        .where(inArray(crmContacts.id, contactIds));
      
      for (const contact of contacts) {
        if (contact.email) {
          emailSet.add(contact.email.toLowerCase());
        }
      }
    }

    return res.json({ emails: Array.from(emailSet) });
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] fetch lead emails error");
    return res.status(500).json({ message: "Failed to fetch lead emails" });
  }
});

// GET /api/crm/leads/:id
router.get("/api/crm/leads/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const lead = await getLead(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const safe = CRMLeadSchema.safeParse(lead);
    if (!safe.success) return res.status(500).json({ message: "Invalid lead payload" });
    return res.json(safe.data);
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] lead details error");
    return res.status(500).json({ message: "Failed to fetch lead" });
  }
});

// POST /api/crm/leads/:id/convert — Convert lead to customer
router.post("/api/crm/leads/:id/convert", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const { convertLead } = await import("../services/crm/leads");
    const result = await convertLead(id);
    return res.json(result);
  } catch (error: unknown) {
    const status =
      typeof (error as { status?: unknown })?.status === "number"
        ? (error as { status?: number }).status || 500
        : 500;
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to convert lead";
    logger.error({ msg }, "[CRM] convert lead error");
    return res.status(status).json({ message: msg });
  }
});

// POST /api/crm/leads/:id/archive — Archive lead
router.post("/api/crm/leads/:id/archive", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });
  try {
    const { archiveLead } = await import("../services/crm/leads");
    await archiveLead(id);
    return res.json({ status: "ok", archived: true });
  } catch (error: unknown) {
    const status =
      typeof (error as { status?: unknown })?.status === "number"
        ? (error as { status?: number }).status || 500
        : 500;
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "Failed to archive lead";
    logger.error({ msg }, "[CRM] archive lead error");
    return res.status(status).json({ message: msg });
  }
});

// POST /api/crm/leads/:id/messages — Send message from lead context (proxy to messaging endpoints)
router.post(
  "/api/crm/leads/:id/messages",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ message: "id is required" });

    const schema = z.object({
      channel: z.enum(["email", "sms"]),
      to: z.string().min(1),
      subject: z.string().optional(), // For email
      body: z.string().min(1),
      html: z.string().optional(), // For email
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
    }

    const { channel, to, subject, body, html } = parsed.data;

    try {
      // Get the lead to find contactId
      const lead = await getLead(id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (!lead.contactId)
        return res.status(400).json({ message: "Lead has no contact associated" });

      const contactId = lead.contactId;

      // Proxy to the appropriate messaging endpoint
      if (channel === "email") {
        if (!subject) return res.status(400).json({ message: "subject is required for email" });
        const result = await sendEmail({
          to,
          from: `${req.user?.email || "noreply@seedfinancial.io"}`,
          subject,
          text: body,
          html: html || undefined,
        });
        const message = await storeOutboundMessage({
          contactId,
          channel: "email",
          direction: "outbound",
          body,
          status: "sent",
          provider: "mailgun",
          providerMessageId: result.id,
          threadKey: generateThreadKey(contactId, "email", subject),
        });
        return res.json({
          success: true,
          messageId: message.id,
          providerMessageId: result.id,
        });
      } else if (channel === "sms") {
        const result = await sendSMS({ to, body });
        const message = await storeOutboundMessage({
          contactId,
          channel: "sms",
          direction: "outbound",
          body,
          status: result.status,
          provider: "twilio",
          providerMessageId: result.sid,
          threadKey: generateThreadKey(contactId, "sms", to),
        });
        return res.json({
          success: true,
          messageId: message.id,
          providerMessageId: result.sid,
          status: result.status,
        });
      }

      return res.status(400).json({ message: "Invalid channel" });
    } catch (error: unknown) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? (error as { message: string }).message
          : "Failed to send message";
      logger.error({ msg }, "[CRM] lead message send error");
      return res.status(500).json({ message: msg });
    }
  }
);

// GET /api/crm/contacts/:id  (id or email)
router.get("/api/crm/contacts/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ message: "id is required" });

  try {
    const details = await getContactDetails(id);
    if (!details) return res.status(404).json({ message: "Contact not found" });
    const safe = ContactDetailsSchema.safeParse(details);
    if (!safe.success) return res.status(500).json({ message: "Invalid details payload" });
    return res.json(safe.data);
  } catch (error: any) {
    logger.error({ err: error }, "[CRM] details error");
    return res.status(500).json({ message: "Failed to fetch contact" });
  }
});

// ============================================================================
// Phase 2: Messaging Foundation
// ============================================================================

// POST /api/crm/messages/email/send — Send email via Mailgun
router.post(
  "/api/crm/messages/email/send",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const schema = z.object({
      contactId: z.string().uuid(),
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      html: z.string().optional(),
      threadKey: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.errors,
      });
    }

    const { contactId, to, subject, body, html, threadKey } = parsed.data;
    const user = req.user;

    if (!user || !user.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Send via Mailgun
      const result = await sendEmail({
        to,
        from: `${user.email}`,
        subject,
        text: body,
        html: html || undefined,
        headers: threadKey ? { "In-Reply-To": threadKey } : undefined,
      });

      // Store in database
      const message = await storeOutboundMessage({
        contactId,
        channel: "email",
        direction: "outbound",
        body,
        status: "sent",
        provider: "mailgun",
        providerMessageId: result.id,
        threadKey: threadKey || generateThreadKey(contactId, "email", subject),
      });

      return res.json({
        success: true,
        messageId: message.id,
        providerMessageId: result.id,
      });
    } catch (error: unknown) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? (error as { message: string }).message
          : "Failed to send email";
      logger.error({ msg }, "[CRM] Email send error");
      return res.status(500).json({ message: msg });
    }
  }
);

// POST /api/crm/messages/sms/send — Send SMS via Twilio
router.post(
  "/api/crm/messages/sms/send",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const schema = z.object({
      contactId: z.string().uuid(),
      to: z.string().min(10), // Phone number
      body: z.string().min(1).max(1600), // SMS character limit
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.errors,
      });
    }

    const { contactId, to, body } = parsed.data;

    try {
      // Send via Twilio
      const result = await sendSMS({
        to,
        body,
      });

      // Store in database
      const message = await storeOutboundMessage({
        contactId,
        channel: "sms",
        direction: "outbound",
        body,
        status: result.status,
        provider: "twilio",
        providerMessageId: result.sid,
        threadKey: generateThreadKey(contactId, "sms", to),
      });

      return res.json({
        success: true,
        messageId: message.id,
        providerMessageId: result.sid,
        status: result.status,
      });
    } catch (error: unknown) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? (error as { message: string }).message
          : "Failed to send SMS";
      logger.error({ msg }, "[CRM] SMS send error");
      return res.status(500).json({ message: msg });
    }
  }
);

// POST /api/crm/webhooks/email — Mailgun inbound email webhook
router.post("/api/crm/webhooks/email", async (req: Request, res: Response) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    },
    "[Webhook:Email] Endpoint hit!"
  );

  try {
    // Optional: Verify Mailgun signature (recommended for production)
    // Only verify if signing key is configured
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

    if (signingKey) {
      const timestamp = req.body.timestamp;
      const token = req.body.token;
      const signature = req.body.signature;

      if (!timestamp || !token || !signature) {
        logger.warn(
          { hasTimestamp: !!timestamp, hasToken: !!token, hasSignature: !!signature },
          "[Webhook:Email] Signing key configured but signature fields missing"
        );
        // Don't fail - Mailgun test webhooks might not include signature
      } else {
        const crypto = await import("crypto");
        const value = timestamp + token;
        const hash = crypto.createHmac("sha256", signingKey).update(value).digest("hex");

        if (hash !== signature) {
          logger.error(
            { receivedSignature: signature, expectedHash: hash, timestamp },
            "[Webhook:Email] Invalid Mailgun signature"
          );
          return res.status(401).json({ error: "Invalid signature" });
        }

        logger.info("[Webhook:Email] Mailgun signature verified ✓");
      }
    } else {
      logger.info("[Webhook:Email] No signing key - accepting webhook without verification");
    }

    const inboundEmail = parseInboundEmail(req);

    logger.info(
      {
        from: inboundEmail.from,
        to: inboundEmail.to,
        subject: inboundEmail.subject,
        messageId: inboundEmail.messageId,
      },
      "[Webhook:Email] Received inbound email"
    );

    // Find or create contact by email
    logger.info({ from: inboundEmail.from }, "[Webhook:Email] Finding/creating contact");
    const contactId = await findOrCreateContactByEmail(inboundEmail.from);
    logger.info({ contactId }, "[Webhook:Email] Contact resolved");

    // Store inbound message
    logger.info("[Webhook:Email] Storing message in database...");
    const storedMessage = await storeInboundMessage({
      contactId,
      channel: "email",
      direction: "inbound",
      body: inboundEmail.text || inboundEmail.html || "",
      status: "received",
      provider: "mailgun",
      providerMessageId: inboundEmail.messageId,
      threadKey: generateThreadKey(contactId, "email", inboundEmail.subject),
      raw: {
        from: inboundEmail.from,
        to: inboundEmail.to,
        subject: inboundEmail.subject,
        headers: inboundEmail.headers,
      },
    });
    logger.info({ messageId: storedMessage.id }, "[Webhook:Email] Message stored successfully");

    return res.status(200).json({ status: "ok", messageId: storedMessage.id });
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "unknown";
    logger.error({ msg }, "[Webhook:Email] Error");
    return res.status(500).json({ error: msg });
  }
});

// POST /api/crm/webhooks/sms — Twilio inbound SMS webhook
router.post("/api/crm/webhooks/sms", async (req: Request, res: Response) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      hasBody: !!req.body,
      hasTwilioSignature: !!req.header("X-Twilio-Signature"),
    },
    "[Webhook:SMS] Endpoint hit!"
  );

  try {
    // Optional: Verify Twilio signature (recommended for production)
    const twilioSignature = req.header("X-Twilio-Signature");
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Build URL using forwarded headers (matches Twilio's signed URL behind proxies)
    const scheme = (req.get("x-forwarded-proto") || req.protocol || "http").toString();
    const host = (req.get("x-forwarded-host") || req.get("host") || "").toString();
    const url = `${scheme}://${host}${req.originalUrl}`;

    logger.debug(
      { hasSignature: !!twilioSignature, hasAuthToken: !!authToken, scheme, host, url },
      "[Webhook:SMS] Signature check inputs"
    );

    if (twilioSignature && authToken) {
      // Resolve validateRequest for both CJS and ESM module shapes
      const twilioMod: any = await import("twilio");
      const validateRequestFn = twilioMod?.validateRequest || twilioMod?.default?.validateRequest;

      if (typeof validateRequestFn !== "function") {
        logger.error("[Webhook:SMS] validateRequest not available on twilio module");
        return res.status(500).json({ error: "Signature validator unavailable" });
      }

      const isValid = validateRequestFn(authToken, twilioSignature, url, req.body);

      if (!isValid) {
        logger.warn({ url }, "[Webhook:SMS] Invalid Twilio signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      logger.info("[Webhook:SMS] Twilio signature verified ✓");
    } else {
      logger.info(
        "[Webhook:SMS] Skipping signature verification (missing signature or auth token)"
      );
    }

    const inboundSMS = parseInboundSMS(req);

    logger.info(
      { from: inboundSMS.from, to: inboundSMS.to, messageSid: inboundSMS.messageSid },
      "[Webhook:SMS] Received inbound SMS"
    );

    // Find or create contact by phone
    const contactId = await findOrCreateContactByPhone(inboundSMS.from);

    // Store inbound message
    await storeInboundMessage({
      contactId,
      channel: "sms",
      direction: "inbound",
      body: inboundSMS.body,
      status: "received",
      provider: "twilio",
      providerMessageId: inboundSMS.messageSid,
      threadKey: generateThreadKey(contactId, "sms", inboundSMS.from),
      raw: {
        from: inboundSMS.from,
        to: inboundSMS.to,
        numMedia: inboundSMS.numMedia,
        mediaUrls: inboundSMS.mediaUrls,
      },
    });

    // Twilio expects TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thanks for your message! We'll get back to you soon.</Message>
</Response>`;

    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "unknown";
    logger.error({ msg }, "[Webhook:SMS] Error");
    res.set("Content-Type", "text/xml");
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// ============================================================================
// Phase 2b: Voice Call Handling
// ============================================================================

// POST /api/crm/webhooks/voice — Twilio inbound voice call webhook
router.post("/api/crm/webhooks/voice", async (req: Request, res: Response) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      hasBody: !!req.body,
      hasTwilioSignature: !!req.header("X-Twilio-Signature"),
    },
    "[Webhook:Voice] Endpoint hit!"
  );

  try {
    // Optional: Verify Twilio signature (recommended for production)
    const twilioSignature = req.header("X-Twilio-Signature");
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Build URL using forwarded headers (matches Twilio's signed URL behind proxies)
    const scheme = (req.get("x-forwarded-proto") || req.protocol || "http").toString();
    const host = (req.get("x-forwarded-host") || req.get("host") || "").toString();
    const url = `${scheme}://${host}${req.originalUrl}`;

    logger.debug(
      { hasSignature: !!twilioSignature, hasAuthToken: !!authToken, scheme, host, url },
      "[Webhook:Voice] Signature check inputs"
    );

    if (twilioSignature && authToken) {
      // Resolve validateRequest for both CJS and ESM module shapes
      const twilioMod: any = await import("twilio");
      const validateRequestFn = twilioMod?.validateRequest || twilioMod?.default?.validateRequest;

      if (typeof validateRequestFn !== "function") {
        logger.error("[Webhook:Voice] validateRequest not available on twilio module");
        res.set("Content-Type", "text/xml");
        return res
          .status(500)
          .send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
      }

      const isValid = validateRequestFn(authToken, twilioSignature, url, req.body);

      if (!isValid) {
        logger.warn({ url }, "[Webhook:Voice] Invalid Twilio signature");
        res.set("Content-Type", "text/xml");
        return res
          .status(403)
          .send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
      }

      logger.info("[Webhook:Voice] Twilio signature verified ✓");
    } else {
      logger.info(
        "[Webhook:Voice] Skipping signature verification (missing signature or auth token)"
      );
    }

    const voiceBody = req.body as Record<string, string>;
    const callSid = voiceBody.CallSid || "";
    const from = voiceBody.From || "";
    const to = voiceBody.To || "";
    const callStatus = voiceBody.CallStatus || "";

    logger.info({ callSid, from, to, callStatus }, "[Webhook:Voice] Received inbound call");

    // Find or create contact by phone
    logger.info({ from }, "[Webhook:Voice] Finding/creating contact");
    const contactId = await findOrCreateContactByPhone(from);
    logger.info({ contactId }, "[Webhook:Voice] Contact resolved");

    // Store call as message
    logger.info("[Webhook:Voice] Storing call in database...");
    const storedMessage = await storeInboundMessage({
      contactId,
      channel: "voice",
      direction: "inbound",
      body: `Incoming call from ${from}`,
      status: callStatus.toLowerCase(),
      provider: "twilio",
      providerMessageId: callSid,
      threadKey: generateThreadKey(contactId, "sms", from), // Use same thread as SMS
      raw: {
        from,
        to,
        callSid,
        callStatus,
      },
    });
    logger.info({ messageId: storedMessage.id }, "[Webhook:Voice] Call stored successfully");

    // Return TwiML to handle the call
    // Phase 2b: Simple greeting and voicemail
    // Phase 3+: Route to available reps, IVR menu, call recording
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Seed Financial. Please leave a message after the tone, and we'll get back to you shortly.</Say>
  <Record maxLength="120" transcribe="true" transcribeCallback="/api/crm/webhooks/voicemail-transcription"/>
  <Say voice="alice">Thank you. We'll contact you soon. Goodbye.</Say>
  <Hangup/>
</Response>`;

    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml);
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "unknown";
    logger.error({ msg }, "[Webhook:Voice] Error");
    res.set("Content-Type", "text/xml");
    return res
      .status(500)
      .send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
});

// POST /api/crm/webhooks/call-status — Twilio call status updates
// Updates call records with status/duration as the call progresses
router.post("/api/crm/webhooks/call-status", async (req: Request, res: Response) => {
  logger.info({ method: req.method, path: req.path }, "[Webhook:CallStatus] Endpoint hit!");

  try {
    const statusBody = req.body as Record<string, unknown>;
    const callSid = String(statusBody.CallSid || "");
    const callStatus = String(statusBody.CallStatus || "");
    const callDuration = statusBody.CallDuration
      ? parseInt(String(statusBody.CallDuration), 10)
      : undefined;
    const from = String(statusBody.From || "");
    const to = String(statusBody.To || "");

    logger.info(
      { callSid, callStatus, callDuration, from, to },
      "[Webhook:CallStatus] Call status update"
    );

    // Update the call message record in database
    if (callSid && db) {
      const { crmMessages } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Find the message by provider message ID (CallSid)
      const messages = await db
        .select()
        .from(crmMessages)
        .where(eq(crmMessages.providerMessageId, callSid))
        .limit(1);

      if (messages.length > 0) {
        const message = messages[0];

        // Update status and add duration to raw data
        await db
          .update(crmMessages)
          .set({
            status: callStatus.toLowerCase(),
            raw: {
              ...((message.raw as Record<string, unknown>) || {}),
              callStatus,
              callDuration,
              lastUpdated: new Date().toISOString(),
            },
          })
          .where(eq(crmMessages.id, message.id));

        logger.info(
          { messageId: message.id, newStatus: callStatus, duration: callDuration },
          "[Webhook:CallStatus] Updated call record"
        );

        // Stop condition: outbound call connected and logged
        const connectedStates = new Set(["in-progress", "completed"]);
        const isConnected = connectedStates.has(callStatus.toLowerCase());
        const isOutbound = String((message as any).direction || "").toLowerCase() === "outbound";
        if (isConnected && isOutbound && (message as any).contactId) {
          try {
            await handleContactedStopConditions(String((message as any).contactId));
            logger.info(
              { contactId: String((message as any).contactId) },
              "[Webhook:CallStatus] Applied stop conditions for contact"
            );
          } catch (e) {
            logger.error({ err: e }, "[Webhook:CallStatus] Failed to apply stop conditions");
          }
        }
      } else {
        logger.warn({ callSid }, "[Webhook:CallStatus] No message found for CallSid");
      }
    }

    // Acknowledge receipt (no TwiML needed for status callbacks)
    return res.status(200).json({ status: "ok" });
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "unknown";
    logger.error({ msg }, "[Webhook:CallStatus] Error");
    return res.status(200).json({ status: "ok" }); // Still return 200 to avoid retries
  }
});

// ==========================================================================
// Outbound Voice Calls
// ==========================================================================

// POST /api/crm/calls/outbound — initiate an outbound voice call via Twilio
router.post(
  "/api/crm/calls/outbound",
  requireAuth,
  apiRateLimit,
  async (req: Request, res: Response) => {
    const schema = z.object({
      contactId: z.string().uuid(),
      to: z.string().min(10),
      from: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
    }

    const { contactId, to, from } = parsed.data;

    try {
      // Build absolute URLs for callbacks based on current request
      const scheme = (req.get("x-forwarded-proto") || req.protocol || "http").toString();
      const host = (req.get("x-forwarded-host") || req.get("host") || "").toString();
      const baseUrl = `${scheme}://${host}`;

      const statusCallbackUrl = `${baseUrl}/api/crm/webhooks/call-status`;
      const twimlUrl = `${baseUrl}/api/crm/voice/outbound-twiml`;

      // Initiate call
      const result = await initiateVoiceCall({ to, from, statusCallbackUrl, twimlUrl });

      // Log outbound call in CRM messages
      const message = await storeOutboundMessage({
        contactId,
        channel: "voice",
        direction: "outbound",
        body: `Outbound call to ${to}`,
        status: result.status,
        provider: "twilio",
        providerMessageId: result.sid,
        threadKey: generateThreadKey(contactId, "sms", to),
      });

      return res.json({
        success: true,
        callSid: result.sid,
        messageId: message.id,
        status: result.status,
      });
    } catch (error: unknown) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? (error as { message: string }).message
          : "Failed to start call";
      logger.error({ msg }, "[CRM] Outbound call error");
      return res.status(500).json({ message: msg });
    }
  }
);

// POST /api/crm/voice/outbound-twiml — TwiML for outbound calls
router.post("/api/crm/voice/outbound-twiml", async (_req: Request, res: Response) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is Seed Financial. This call may be recorded for quality and training purposes.</Say>
  <Pause length="1"/>
  <Say voice="alice">If you need assistance, please reply to our SMS or email. Goodbye.</Say>
  <Hangup/>
</Response>`;
  res.set("Content-Type", "text/xml");
  return res.status(200).send(twiml);
});

// POST /api/crm/webhooks/voicemail-transcription — Twilio voicemail transcription callback
// Stores transcription text in the call message record
router.post("/api/crm/webhooks/voicemail-transcription", async (req: Request, res: Response) => {
  logger.info(
    { method: req.method, path: req.path },
    "[Webhook:Voicemail] Transcription received!"
  );

  try {
    const transcriptionBody = req.body as Record<string, unknown>;
    const callSid = String(transcriptionBody.CallSid || "");
    const transcriptionText = String(transcriptionBody.TranscriptionText || "");
    const transcriptionStatus = String(transcriptionBody.TranscriptionStatus || "");
    const recordingUrl = String(transcriptionBody.RecordingUrl || "");

    logger.info(
      {
        callSid,
        transcriptionStatus,
        textLength: transcriptionText.length,
        hasRecording: !!recordingUrl,
      },
      "[Webhook:Voicemail] Transcription details"
    );

    // Update the call message with transcription
    if (callSid && transcriptionText && db) {
      const { crmMessages } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const messages = await db
        .select()
        .from(crmMessages)
        .where(eq(crmMessages.providerMessageId, callSid))
        .limit(1);

      if (messages.length > 0) {
        const message = messages[0];

        await db
          .update(crmMessages)
          .set({
            body: `Voicemail: ${transcriptionText}`,
            raw: {
              ...((message.raw as Record<string, unknown>) || {}),
              transcriptionText,
              transcriptionStatus,
              recordingUrl,
              transcribedAt: new Date().toISOString(),
            },
          })
          .where(eq(crmMessages.id, message.id));

        logger.info(
          { messageId: message.id, textPreview: `${transcriptionText.substring(0, 50)}...` },
          "[Webhook:Voicemail] Updated call with transcription"
        );
      } else {
        logger.warn({ callSid }, "[Webhook:Voicemail] No message found for CallSid");
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (error: unknown) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "unknown";
    logger.error({ msg }, "[Webhook:Voicemail] Error");
    return res.status(200).json({ status: "ok" });
  }
});

export default router;
