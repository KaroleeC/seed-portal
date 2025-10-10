/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../db";
import { crmLeads, crmContacts, intakeWebhooks } from "@shared/schema";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";
import { cache, CacheTTL } from "../../cache";
import { sendSlackMessage, sendSystemAlert } from "../../slack";
import { CRMLeadSchema, LeadsListResultSchema, type CRMLead } from "@shared/contracts";
import { getLeadConfig } from "./config";

export interface LeadFilters {
  status?: string;
  stage?: string;
  assignedTo?: string;
  source?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

// =============================
// Zapier Intake
// =============================

export interface IngestLeadInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  assignedTo?: string | null;
  source?: string | null; // default 'zapier'
  status?: string | null; // default 'new'
  stage?: string | null; // default 'unassigned'
  [key: string]: unknown;
}

export interface IngestResult {
  id: string; // lead id
  contactId: string;
  status: string;
  stage: string;
}

async function normalizeSource(input: unknown): Promise<string> {
  const cfg = await getLeadConfig();
  const allowed = new Set(cfg.sources.map((x) => String(x).toLowerCase()));
  const s = String(input ?? "zapier")
    .trim()
    .toLowerCase();
  if (allowed.has(s)) return s;
  // Common aliases
  if (["fb", "facebook ads", "meta"].includes(s) && allowed.has("facebook")) return "facebook";
  return allowed.has("other") ? "other" : cfg.sources[0] || "other";
}

async function normalizeStatus(input: unknown): Promise<string> {
  const cfg = await getLeadConfig();
  const allowed = new Set(cfg.statuses.map((x) => String(x).toLowerCase()));
  const s = String(input ?? "new")
    .trim()
    .toLowerCase();
  if (allowed.has(s)) return s;
  if (allowed.has("new")) return "new";
  return cfg.statuses[0] ? String(cfg.statuses[0]).toLowerCase() : "new";
}

async function normalizeStage(input: unknown): Promise<string> {
  const cfg = await getLeadConfig();
  const allowed = new Set(cfg.stages.map((x) => String(x).toLowerCase()));
  const s = String(input ?? "unassigned")
    .trim()
    .toLowerCase();
  if (allowed.has(s)) return s;
  if (allowed.has("unassigned")) return "unassigned";
  return cfg.stages[0] ? String(cfg.stages[0]).toLowerCase() : "unassigned";
}

function inputError(message: string): any {
  const e: any = new Error(message);
  e.status = 400;
  return e;
}

async function resolveAssigneeId(assignedTo: unknown): Promise<string | null> {
  const s = String(assignedTo ?? "").trim();
  if (!s) return null;
  // ID path
  if (/^\d+$/.test(s)) {
    const id = parseInt(s, 10);
    const rows: any = await (db as any).execute(sql`SELECT id FROM users WHERE id = ${id} LIMIT 1`);
    if ((rows as any)?.rows?.[0]?.id) return String((rows as any).rows[0].id);
    throw inputError("assignedTo user id not found");
  }
  // Email path
  if (s.includes("@")) {
    const emailLc = s.toLowerCase();
    const rows: any = await (db as any).execute(
      sql`SELECT id FROM users WHERE lower(email) = ${emailLc} LIMIT 1`
    );
    if ((rows as any)?.rows?.[0]?.id) return String((rows as any).rows[0].id);
    throw inputError("assignedTo email not recognized");
  }
  throw inputError("assignedTo must be a user id or email");
}

export async function ingestZapierLead(
  payload: IngestLeadInput,
  idempotencyKey?: string
): Promise<IngestResult> {
  if (!db) throw new Error("Database not initialized");
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("email is required");

  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  if (isProd && (!idempotencyKey || !String(idempotencyKey).trim())) {
    const err: any = new Error("X-Idempotency-Key header required in production");
    err.status = 400;
    throw err;
  }

  // Idempotency key: prefer header, fallback to hash of payload
  const idem =
    idempotencyKey?.trim() ||
    createHash("sha1").update(JSON.stringify({ email, payload })).digest("hex");

  // Check if already processed
  const [existingWebhook] = await db
    .select()
    .from(intakeWebhooks)
    .where(eq(intakeWebhooks.idempotencyKey as any, idem as any));
  if (existingWebhook) {
    // Try to return prior result if present in payload meta
    const meta = (existingWebhook as any).payload || {};
    if (meta && meta.resultLeadId && meta.resultContactId) {
      return {
        id: String(meta.resultLeadId),
        contactId: String(meta.resultContactId),
        status: String(meta.resultStatus || "new"),
        stage: String(meta.resultStage || "unassigned"),
      };
    }
    // Otherwise, return a generic success
    return {
      id: String((existingWebhook as any).id || ""),
      contactId: "",
      status: "new",
      stage: "unassigned",
    };
  }

  // Insert webhook log (pending)
  const webhookId = randomUUID();
  await db.insert(intakeWebhooks).values({
    id: webhookId,
    idempotencyKey: idem,
    source: String(payload.source || "zapier"),
    payload: payload as any,
    processedStatus: "pending",
  } as any);

  try {
    // DO NOT create contact yet - contacts are only created on conversion
    // All lead data stays in the payload until "Send to Calculator" is clicked

    // Insert lead (with no contactId)
    let leadId = String(randomUUID());
    const leadStatus = await normalizeStatus(payload.status);
    const leadStage = await normalizeStage(payload.stage);
    const leadSource = await normalizeSource(payload.source || "zapier");
    const assigneeId = await resolveAssigneeId((payload as any).assignedTo);

    // Optional dedupe: update existing open lead for same email (check payload.email)
    const dedupeOpen = (process.env.CRM_DEDUPE_OPEN_LEAD || "true").toLowerCase() !== "false";
    if (dedupeOpen) {
      const existing: any = await (db as any).execute(sql`
        SELECT id, status, stage FROM crm_leads
        WHERE payload->>'email' = ${email}
          AND status <> 'disqualified'
          AND stage NOT IN ('closed_won','closed_lost')
          AND archived = false
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const existingRow = (existing as any)?.rows?.[0];
      if (existingRow?.id) {
        leadId = String(existingRow.id);
        await (db as any).execute(sql`
          UPDATE crm_leads
             SET source = ${leadSource},
                 status = ${leadStatus},
                 stage = ${leadStage},
                 assigned_to = ${assigneeId ?? null},
                 payload = ${JSON.stringify(payload)},
                 updated_at = now()
           WHERE id = ${leadId}
        `);
      } else {
        await db.insert(crmLeads).values({
          id: leadId,
          contactId: null, // No contact until converted
          source: leadSource,
          status: leadStatus,
          stage: leadStage,
          assignedTo: assigneeId,
          payload: payload as any,
        } as any);
      }
    } else {
      await db.insert(crmLeads).values({
        id: leadId,
        contactId: null, // No contact until converted
        source: leadSource,
        status: leadStatus,
        stage: leadStage,
        assignedTo: assigneeId,
        payload: payload as any,
      } as any);
    }

    // Mark webhook as processed successfully (store result IDs in payload for idempotency returns)
    const processedPayload = {
      ...payload,
      resultLeadId: leadId,
      resultContactId: null, // No contact created yet
      resultStatus: leadStatus,
      resultStage: leadStage,
    };
    await (db as any)
      .update(intakeWebhooks)
      .set({
        processedStatus: "success",
        processedAt: new Date(),
        payload: processedPayload as any,
        error: null,
      })
      .where(eq(intakeWebhooks.id as any, webhookId as any));

    // Best-effort Slack notification (guarded inside try/catch)
    try {
      await sendSlackMessage({
        text: `New lead (${leadSource})`,
        attachments: [
          {
            color: "#36C5F0",
            fields: [
              { title: "Email", value: email, short: true },
              { title: "Status", value: leadStatus, short: true },
              { title: "Stage", value: leadStage, short: true },
              { title: "Contact ID", value: "-", short: true },
              { title: "Lead ID", value: leadId, short: true },
            ],
          },
        ],
      });
    } catch {}

    return { id: leadId, contactId: "", status: leadStatus, stage: leadStage };
  } catch (err: any) {
    // Mark webhook as failed
    await (db as any)
      .update(intakeWebhooks)
      .set({
        processedStatus: "failed",
        processedAt: new Date(),
        error: String(err?.message || err),
      })
      .where(eq(intakeWebhooks.id as any, webhookId as any));
    // Best-effort Slack alert
    try {
      await sendSystemAlert(
        "Lead intake failed",
        `email=${email} error=${String(err?.message || err)}`,
        "high"
      );
    } catch {}
    throw err;
  }
}

function toLead(row: any): CRMLead {
  // Extract contact data from payload (Zapier data) or fall back to joined contact fields
  const payload = row.payload || {};
  // Normalize phone from common intake key variants
  let payloadPhone =
    payload.phone ||
    payload.phone_number ||
    payload.phoneNumber ||
    payload.mobile ||
    payload.mobile_phone ||
    payload.mobilePhone ||
    payload.contact_phone ||
    payload.contactPhone ||
    payload.Phone ||
    null;
  if (!payloadPhone && payload && typeof payload === "object") {
    for (const [k, v] of Object.entries(payload)) {
      if (/(phone|mobile)/i.test(k) && (typeof v === "string" || typeof v === "number")) {
        const s = String(v).trim();
        if (s) {
          payloadPhone = s;
          break;
        }
      }
    }
  }

  return {
    id: String(row.id),
    contactId: row.contactId ?? null,
    source: String(row.source),
    status: String(row.status),
    stage: String(row.stage),
    assignedTo: row.assignedTo ?? null,
    payload: row.payload ?? undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    lastContactedAt: row.lastContactedAt ? new Date(row.lastContactedAt).toISOString() : null,
    nextActionAt: row.nextActionAt ? new Date(row.nextActionAt).toISOString() : null,
    // Contact fields: prioritize payload (Zapier data) over joined contact
    contactFirstName: payload.firstName || row.contactFirstName || undefined,
    contactLastName: payload.lastName || row.contactLastName || undefined,
    contactCompanyName: payload.companyName || row.contactCompanyName || undefined,
    contactEmail: payload.email || row.contactEmail || undefined,
    contactPhone:
      (payloadPhone ? String(payloadPhone) : undefined) || row.contactPhone || undefined,
  } as any;
}

export async function listLeads(
  filters: LeadFilters
): Promise<{ leads: CRMLead[]; total: number }> {
  const { status, stage, assignedTo, source, q, limit = 20, offset = 0 } = filters;
  const cacheKey = cache.generateKey("crm:leads:list:v2", {
    status,
    stage,
    assignedTo,
    source,
    q,
    limit,
    offset,
  });

  return await cache.wrap(
    cacheKey,
    async () => {
      const whereClauses: any[] = [];
      if (status) whereClauses.push(eq(crmLeads.status, status));
      if (stage) whereClauses.push(eq(crmLeads.stage, stage));
      if (assignedTo) whereClauses.push(eq(crmLeads.assignedTo, assignedTo));
      if (source) whereClauses.push(eq(crmLeads.source, source));

      let searchClause: any = null;
      if (q && q.trim().length) {
        const term = `%${q.trim()}%`;
        // Search across contact fields and payload string
        searchClause = or(
          like(crmContacts.email, term),
          like(crmContacts.firstName, term),
          like(crmContacts.lastName, term),
          like(crmContacts.companyName, term),
          sql`crm_leads.payload::text ILIKE ${term}`
        );
      }

      let mergedWhere: any = undefined;
      if (whereClauses.length && searchClause) {
        mergedWhere = and(...whereClauses, searchClause as any);
      } else if (whereClauses.length) {
        mergedWhere = and(...whereClauses);
      } else if (searchClause) {
        mergedWhere = searchClause;
      }

      let rowsQuery = db
        .select({
          id: crmLeads.id,
          contactId: crmLeads.contactId,
          source: crmLeads.source,
          status: crmLeads.status,
          stage: crmLeads.stage,
          assignedTo: crmLeads.assignedTo,
          payload: crmLeads.payload,
          lastContactedAt: crmLeads.lastContactedAt,
          nextActionAt: crmLeads.nextActionAt,
          createdAt: crmLeads.createdAt,
          updatedAt: crmLeads.updatedAt,
          // Contact fields for display
          contactFirstName: crmContacts.firstName,
          contactLastName: crmContacts.lastName,
          contactCompanyName: crmContacts.companyName,
          contactEmail: crmContacts.email,
          contactPhone: crmContacts.phone,
        })
        .from(crmLeads)
        .leftJoin(crmContacts, eq(crmLeads.contactId, crmContacts.id));
      if (mergedWhere) {
        rowsQuery = (rowsQuery as any).where(mergedWhere as any);
      }
      const rows = await (rowsQuery as any)
        .orderBy(desc(crmLeads.updatedAt))
        .limit(limit)
        .offset(offset);

      let countQuery = db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(crmLeads)
        .leftJoin(crmContacts, eq(crmLeads.contactId, crmContacts.id));
      if (mergedWhere) {
        countQuery = (countQuery as any).where(mergedWhere as any);
      }
      const [{ count }] = await (countQuery as any);

      const leads = (rows || []).map(toLead);
      const result = { leads, total: Number(count || leads.length) };
      const safe = LeadsListResultSchema.safeParse(result);
      return safe.success ? safe.data : result;
    },
    { ttl: CacheTTL.TEN_MINUTES }
  );
}

export async function getLead(id: string): Promise<CRMLead | null> {
  const cacheKey = cache.generateKey("crm:lead", id);
  return await cache.wrap(
    cacheKey,
    async () => {
      const [row] = await db.select().from(crmLeads).where(eq(crmLeads.id, id));
      if (!row) return null;
      const lead = toLead(row);
      const safe = CRMLeadSchema.safeParse(lead);
      return safe.success ? safe.data : (lead as any);
    },
    { ttl: CacheTTL.TEN_MINUTES }
  );
}

// =============================
// Phase 3: Convert and Archive
// =============================

export interface ConvertLeadResult {
  leadId: string;
  contactId: string;
}

/**
 * Convert a lead to a customer
 * Creates contact from lead payload and marks lead as converted/archived
 */
export async function convertLead(leadId: string): Promise<ConvertLeadResult> {
  if (!db) throw new Error("Database not initialized");

  // Fetch the lead
  const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));

  if (!lead) {
    const err: any = new Error("Lead not found");
    err.status = 404;
    throw err;
  }

  // Extract contact data from payload
  const payload = (lead.payload || {}) as any;
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    const err: any = new Error("Lead has no email in payload");
    err.status = 400;
    throw err;
  }

  // Create or get existing contact
  let contactId: string;
  const [existingContact] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.email as any, email as any));

  // Normalize phone from common intake key variants
  const payloadPhone =
    payload.phone ||
    payload.phone_number ||
    payload.phoneNumber ||
    payload.mobile ||
    payload.mobile_phone ||
    payload.mobilePhone ||
    payload.contact_phone ||
    payload.contactPhone ||
    payload.Phone ||
    null;

  if (existingContact) {
    contactId = String((existingContact as any).id);
    // Update contact with payload data if fields are empty
    const toUpdate: any = {};
    if (payload.firstName && !existingContact.firstName) toUpdate.firstName = payload.firstName;
    if (payload.lastName && !existingContact.lastName) toUpdate.lastName = payload.lastName;
    if (payload.companyName && !existingContact.companyName)
      toUpdate.companyName = payload.companyName;
    if (payloadPhone && !existingContact.phone) toUpdate.phone = String(payloadPhone);
    if (Object.keys(toUpdate).length) {
      await (db as any)
        .update(crmContacts)
        .set(toUpdate)
        .where(eq(crmContacts.id as any, contactId as any));
    }
  } else {
    // Create new contact from lead payload
    contactId = randomUUID();
    await db.insert(crmContacts).values({
      id: contactId,
      email,
      firstName: payload.firstName?.toString() ?? null,
      lastName: payload.lastName?.toString() ?? null,
      companyName: payload.companyName?.toString() ?? null,
      phone: payloadPhone?.toString() ?? null,
    } as any);
  }

  // Mark lead as converted and archived
  await (db as any)
    .update(crmLeads)
    .set({
      convertedAt: new Date(),
      convertedContactId: contactId,
      contactId, // Link the contact now
      archived: true,
      updatedAt: new Date(),
    } as any)
    .where(eq(crmLeads.id as any, leadId as any));

  // Invalidate cache
  await cache.del(cache.generateKey("crm:lead", leadId));

  return { leadId, contactId };
}

/**
 * Archive a lead (soft delete)
 */
export async function archiveLead(leadId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));

  if (!lead) {
    const err: any = new Error("Lead not found");
    err.status = 404;
    throw err;
  }

  await (db as any)
    .update(crmLeads)
    .set({
      archived: true,
      updatedAt: new Date(),
    } as any)
    .where(eq(crmLeads.id as any, leadId as any));

  // Invalidate cache
  await cache.del(cache.generateKey("crm:lead", leadId));
}
