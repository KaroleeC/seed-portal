/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../db";
import { crmContacts, crmDeals, crmNotes, crmTasks, crmMessages, quotes } from "@shared/schema";
import { desc, eq, like, or, sql } from "drizzle-orm";
import {
  ContactDetailsSchema,
  ContactSearchResultSchema,
  type ContactDetails,
  type ContactSummary,
  type CRMDeal,
  type CRMQuote,
} from "@shared/contracts";
import { cache, CacheTTL } from "../../cache";
import { CRMService } from "../../services/crm-service";

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
}

function toSummary(row: any): ContactSummary {
  return {
    id: String(row.id),
    email: String(row.email),
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    companyName: row.companyName ?? null,
    industry: row.industry ?? null,
    revenue: row.revenue ?? null,
    employees: row.employees ?? null,
    lifecycleStage: row.lifecycleStage ?? null,
    lastActivity:
      (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt) || null,
    ownerId: row.ownerId ?? null,
    ownerEmail: row.ownerEmail ?? null,
    servicesCount: 0,
  } as ContactSummary;
}

function mapDeals(rows: any[]): CRMDeal[] {
  return rows.map((r) => ({
    id: String(r.id),
    contactId: r.contactId ?? null,
    name: r.name ?? "",
    stage: r.stage ?? null,
    pipeline: r.pipeline ?? null,
    amount: r.amount ? Number(r.amount) : null,
    closeDate: r.closeDate ? new Date(r.closeDate).toISOString() : null,
    ownerId: r.ownerId ?? null,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
  }));
}

function mapQuotes(rows: any[]): CRMQuote[] {
  return rows.map((r) => ({
    id: Number(r.id),
    contactEmail: r.contactEmail,
    companyName: r.companyName ?? null,
    quoteType: r.quoteType,
    monthlyFee: String(r.monthlyFee),
    setupFee: String(r.setupFee),
    serviceTier: r.serviceTier ?? null,
    hubspotQuoteId: r.hubspotQuoteId ?? null,
    hubspotQuoteExists: Boolean(r.hubspotQuoteId),
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    signedAt: r.signedAt ? new Date(r.signedAt).toISOString() : null,
    signedByName: r.signedByName ?? null,
    signedIp: r.signedIp ?? null,
    stripeCheckoutSessionId: r.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: r.stripePaymentIntentId ?? null,
    paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
    paymentStatus: (r.paymentStatus as any) ?? null,
  }));
}

export async function searchContacts(
  params: SearchParams
): Promise<{ contacts: ContactSummary[]; total: number }> {
  const { q, limit = 20, offset = 0 } = params;
  const cacheKey = cache.generateKey("crm:search", { q, limit, offset });

  return await cache.wrap(
    cacheKey,
    async () => {
      // Primary path: internal CRM
      try {
        const term = `%${q}%`;
        const where = or(
          like(crmContacts.email, term),
          like(crmContacts.firstName, term),
          like(crmContacts.lastName, term),
          like(crmContacts.companyName, term)
        );

        const rows = await db
          .select()
          .from(crmContacts)
          .where(where)
          .orderBy(desc(crmContacts.updatedAt))
          .limit(limit)
          .offset(offset);

        const [{ count }] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(crmContacts)
          .where(where);

        if (rows && rows.length > 0) {
          const contacts = rows.map(toSummary);
          const payload = { contacts, total: Number(count || rows.length) };
          // Validate shape
          const parsed = ContactSearchResultSchema.safeParse(payload);
          if (parsed.success) return parsed.data;
          return payload; // fallback without throwing
        }
      } catch (_) {
        // fall through to HubSpot fallback
      }

      // Fallback: HubSpot CRM
      try {
        const svc = new CRMService();
        const result = await svc.searchContacts(q, limit);
        const contacts: ContactSummary[] = (result.contacts || []).map((c: any) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName ?? null,
          lastName: c.lastName ?? null,
          companyName: c.companyName ?? null,
          industry: c.industry ?? null,
          revenue: null,
          employees: null,
          lifecycleStage: null,
          lastActivity: null,
          ownerId: null,
          ownerEmail: null,
          servicesCount: 0,
        }));
        return { contacts, total: result.total || contacts.length };
      } catch (_) {
        return { contacts: [], total: 0 };
      }
    },
    { ttl: CacheTTL.TEN_MINUTES }
  );
}

export async function getContactDetails(id: string): Promise<ContactDetails | null> {
  const cacheKey = cache.generateKey("crm:contact", id);
  return await cache.wrap(
    cacheKey,
    async () => {
      // Try internal CRM by id, then by email
      let contact: any | undefined;
      try {
        const [byId] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
        if (byId) contact = byId;
        if (!contact && id.includes("@")) {
          const [byEmail] = await db.select().from(crmContacts).where(eq(crmContacts.email, id));
          if (byEmail) contact = byEmail;
        }
      } catch (_) {
        // ignore and fallback
      }

      if (!contact) {
        // HubSpot fallback if id seems to be an email
        if (id.includes("@")) {
          try {
            const svc = new CRMService();
            const c = await svc.findContactByEmail(id);
            if (c) {
              const payload = {
                id: c.id,
                email: c.email,
                firstName: c.firstName ?? null,
                lastName: c.lastName ?? null,
                companyName: c.companyName ?? null,
                industry: c.industry ?? null,
                revenue: null,
                employees: null,
                lifecycleStage: null,
                lastActivity: null,
                ownerId: null,
                ownerEmail: null,
                servicesCount: 0,
                phone: c.phone ?? null,
                services: [],
                deals: [],
                quotes: [],
                notes: [],
                tasks: [],
                messages: [],
                meta: {},
              };
              const parsed = ContactDetailsSchema.safeParse(payload);
              return parsed.success ? parsed.data : (payload as any);
            }
          } catch (_) {}
        }
        return null;
      }

      // Load related data
      const [dealRows, quoteRows] = await Promise.all([
        db
          .select()
          .from(crmDeals)
          .where(eq(crmDeals.contactId, String(contact.id)))
          .orderBy(desc(crmDeals.updatedAt))
          .limit(50),
        db
          .select()
          .from(quotes)
          .where(eq(quotes.contactEmail, String(contact.email)))
          .orderBy(desc(quotes.createdAt))
          .limit(50),
      ]);

      // Optional: notes/tasks/messages (non-blocking best-effort)
      let notes: any[] = [];
      let tasks: any[] = [];
      let messages: any[] = [];
      try {
        const [noteRows, taskRows, messageRows] = await Promise.all([
          db
            .select()
            .from(crmNotes)
            .where(eq(crmNotes.contactId, String(contact.id)))
            .orderBy(desc(crmNotes.createdAt))
            .limit(50),
          db
            .select()
            .from(crmTasks)
            .where(eq(crmTasks.contactId, String(contact.id)))
            .orderBy(desc(crmTasks.updatedAt))
            .limit(50),
          db
            .select()
            .from(crmMessages)
            .where(eq(crmMessages.contactId, String(contact.id)))
            .orderBy(desc(crmMessages.createdAt))
            .limit(50),
        ]);
        notes = noteRows || [];
        tasks = taskRows || [];
        messages = messageRows || [];
      } catch (_) {}

      const details: ContactDetails = {
        ...toSummary(contact),
        phone: contact.phone ?? null,
        services: [],
        deals: mapDeals(dealRows || []),
        quotes: mapQuotes(quoteRows || []),
        notes,
        tasks,
        messages,
        meta: contact.meta || undefined,
      } as any;

      const parsed = ContactDetailsSchema.safeParse(details);
      return parsed.success ? parsed.data : (details as any);
    },
    { ttl: CacheTTL.TEN_MINUTES }
  );
}
