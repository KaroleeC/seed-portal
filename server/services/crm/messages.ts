/**
 * CRM Messages Service
 * Handles storage and retrieval of email/SMS messages
 */

import { db } from "../../db";
import { crmMessages, crmContacts, crmLeads } from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, and, desc, or } from "drizzle-orm";

export interface CreateMessageInput {
  contactId: string;
  channel: "email" | "sms" | "voice" | "chat";
  direction: "inbound" | "outbound";
  body: string;
  status?: string;
  provider?: "mailgun" | "twilio" | "sendgrid";
  providerMessageId?: string;
  threadKey?: string;
  error?: string;
  raw?: Record<string, unknown>;
}

/**
 * Apply stop conditions when we have successfully contacted the lead.
 * Used for events like: outbound call connected and logged, inbound replies, etc.
 * - Sets lastContactedAt
 * - Transitions status new -> validated
 * - Bumps early stages (unassigned/assigned) to contact_made
 */
export async function handleContactedStopConditions(contactId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  try {
    const now = new Date();

    // 1) Always stamp lastContactedAt
    await (db as any)
      .update(crmLeads)
      .set({ lastContactedAt: now, updatedAt: now } as any)
      .where(eq(crmLeads.contactId as any, contactId as any));

    // 2) new -> validated
    await (db as any)
      .update(crmLeads)
      .set({ status: "validated", updatedAt: now } as any)
      .where(
        and(
          eq(crmLeads.contactId as any, contactId as any),
          eq(crmLeads.status as any, "new" as any)
        ) as any
      );

    // 3) stage: unassigned/assigned -> contact_made
    await (db as any)
      .update(crmLeads)
      .set({ stage: "contact_made", updatedAt: now } as any)
      .where(
        and(
          eq(crmLeads.contactId as any, contactId as any),
          or(
            eq(crmLeads.stage as any, "unassigned" as any),
            eq(crmLeads.stage as any, "assigned" as any)
          ) as any
        ) as any
      );
  } catch (error) {
    console.error("[Messages] Failed to apply contacted stop conditions:", error);
  }
}

export interface MessageItem {
  id: string;
  contactId: string;
  channel: string;
  direction: string;
  status?: string;
  body: string;
  provider?: string;
  providerMessageId?: string;
  threadKey?: string;
  error?: string;
  createdAt: string;
}

/**
 * Store an outbound message (email/SMS sent by user)
 */
export async function storeOutboundMessage(input: CreateMessageInput): Promise<MessageItem> {
  if (!db) throw new Error("Database not initialized");

  const id = randomUUID();
  const now = new Date();

  const values: typeof crmMessages.$inferInsert = {
    id,
    contactId: input.contactId,
    channel: input.channel,
    direction: "outbound",
    status: input.status || "sent",
    body: input.body,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    threadKey: input.threadKey,
    error: input.error,
    raw: input.raw,
  };

  await db.insert(crmMessages).values(values);

  return {
    id,
    contactId: input.contactId,
    channel: input.channel,
    direction: "outbound",
    status: input.status || "sent",
    body: input.body,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    threadKey: input.threadKey,
    error: input.error,
    createdAt: now.toISOString(),
  };
}

/**
 * Store an inbound message (email/SMS received from customer)
 * Also triggers lead status transition if applicable
 */
export async function storeInboundMessage(input: CreateMessageInput): Promise<MessageItem> {
  if (!db) throw new Error("Database not initialized");

  const id = randomUUID();
  const now = new Date();

  const values: typeof crmMessages.$inferInsert = {
    id,
    contactId: input.contactId,
    channel: input.channel,
    direction: "inbound",
    status: input.status || "received",
    body: input.body,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    threadKey: input.threadKey,
    error: input.error,
    raw: input.raw,
  };

  await db.insert(crmMessages).values(values);

  // Auto-transition lead status on first inbound message
  await autoTransitionLeadStatus(input.contactId);

  return {
    id,
    contactId: input.contactId,
    channel: input.channel,
    direction: "inbound",
    status: input.status || "received",
    body: input.body,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    threadKey: input.threadKey,
    error: input.error,
    createdAt: now.toISOString(),
  };
}

/**
 * Find or create a contact by email
 * Used when receiving inbound messages from unknown senders
 */
export async function findOrCreateContactByEmail(email: string): Promise<string> {
  if (!db) throw new Error("Database not initialized");

  // Try to find existing contact
  const existing = await db
    .select({ id: crmContacts.id })
    .from(crmContacts)
    .where(eq(crmContacts.email, email))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new contact
  const id = randomUUID();
  await db.insert(crmContacts).values({
    id,
    email,
    lifecycleStage: "lead",
  });

  return id;
}

/**
 * Find or create a contact by phone number
 * Used when receiving inbound SMS from unknown senders
 */
export async function findOrCreateContactByPhone(phone: string): Promise<string> {
  if (!db) throw new Error("Database not initialized");

  // Try to find existing contact
  const existing = await db
    .select({ id: crmContacts.id })
    .from(crmContacts)
    .where(eq(crmContacts.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new contact
  const id = randomUUID();
  // crm_contacts.email is NOT NULL and UNIQUE. When creating a contact from a phone-only
  // source (voice/SMS), use a deterministic placeholder email to satisfy constraints.
  // Format: p<digits>+<8-char-id>@example.invalid (RFC-reserved TLD)
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  const placeholderEmail = `p${digits || "unknown"}+${id.slice(0, 8)}@example.invalid`;
  await db.insert(crmContacts).values({
    id,
    email: placeholderEmail,
    phone,
    lifecycleStage: "lead",
  });

  return id;
}

/**
 * Generate a thread key for grouping related messages
 * Format: {contactId}:{channel}:{subject_hash or phone}
 */
export function generateThreadKey(
  contactId: string,
  channel: "email" | "sms",
  identifier: string // email subject or phone number
): string {
  // Simple hash for email subjects
  const hash = identifier
    .toLowerCase()
    .replace(/^(re:|fwd?:)\s*/gi, "") // Remove Re: and Fwd:
    .trim()
    .substring(0, 20);

  return `${contactId}:${channel}:${hash}`;
}

/**
 * Auto-transition lead status when they make first contact
 * New → Validated on first inbound message
 */
async function autoTransitionLeadStatus(contactId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  try {
    // Find leads associated with this contact
    const leads = await db
      .select()
      .from(crmLeads)
      .where(and(eq(crmLeads.contactId, contactId), eq(crmLeads.status, "new")));

    if (leads.length === 0) {
      return; // No leads to update
    }

    // Update all "new" leads to "validated"
    await db
      .update(crmLeads)
      .set({
        status: "validated",
        lastContactedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(crmLeads.contactId, contactId), eq(crmLeads.status, "new")));

    console.log(
      `[Messages] Auto-transitioned ${leads.length} lead(s) to "validated" for contact ${contactId}`
    );
  } catch (error) {
    console.error("[Messages] Failed to auto-transition lead status:", error);
    // Don't throw - message was stored successfully, this is just a bonus feature
  }
}

/**
 * Get message history for a contact
 */
export async function getContactMessages(contactId: string, limit = 50): Promise<MessageItem[]> {
  if (!db) throw new Error("Database not initialized");

  const messages = await db
    .select()
    .from(crmMessages)
    .where(eq(crmMessages.contactId, contactId))
    .orderBy(desc(crmMessages.createdAt))
    .limit(limit);

  return messages.map(
    (msg: typeof crmMessages.$inferSelect): MessageItem => ({
      id: msg.id,
      contactId: msg.contactId,
      channel: msg.channel,
      direction: msg.direction,
      status: msg.status || undefined,
      body: msg.body,
      provider: msg.provider || undefined,
      providerMessageId: msg.providerMessageId || undefined,
      threadKey: msg.threadKey || undefined,
      error: msg.error || undefined,
      createdAt: msg.createdAt.toISOString(),
    })
  );
}
