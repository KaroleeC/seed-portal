/**
 * Email-Lead Linking Service
 * 
 * DRY service for managing relationships between SEEDMAIL threads and LEADIQ leads.
 * Provides:
 * - Auto-linking based on email address matching
 * - Manual linking/unlinking
 * - Lead search and association
 * - Bulk linking operations
 */

import { pool } from "../db";
import { logger } from "../logger";

const linkLogger = logger.child({ module: "email-lead-linking" });

export interface EmailLeadLink {
  id: string;
  threadId: string;
  leadId: string;
  linkedByUserId: string | null;
  linkSource: "auto" | "manual" | "imported";
  confidenceScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEmailMatch {
  leadId: string;
  matchType: "primary" | "secondary" | "contact";
  matchedEmail: string;
  confidence: number;
}

/**
 * Find leads that match an email address
 * Returns leads with confidence scores based on match type
 */
export async function findLeadsByEmail(email: string): Promise<LeadEmailMatch[]> {
  if (!pool) {
    linkLogger.warn("Database pool not available");
    return [];
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find leads where payload JSONB contains matching email
  // crmLeads schema: { id, payload: { email, name, ... }, ... }
  const query = `
    SELECT 
      l.id as lead_id,
      'primary' as match_type,
      $1 as matched_email,
      1.0 as confidence
    FROM crm_leads l
    WHERE 
      LOWER(l.payload->>'email') = $1
    ORDER BY confidence DESC;
  `;

  try {
    const result = await pool.query(query, [normalizedEmail]);
    
    return result.rows.map((row: any) => ({
      leadId: row.lead_id,
      matchType: row.match_type,
      matchedEmail: row.matched_email,
      confidence: parseFloat(row.confidence),
    }));
  } catch (error) {
    linkLogger.error({ error, email }, "Failed to find leads by email");
    throw error;
  }
}

/**
 * Extract all email addresses from a thread's participants
 */
export async function getThreadParticipantEmails(threadId: string): Promise<string[]> {
  const query = `
    SELECT DISTINCT 
      jsonb_array_elements(participants)->>'email' as email
    FROM email_threads
    WHERE id = $1;
  `;

  try {
    const result = await pool!.query(query, [threadId]);
    return result.rows
      .map((row: any) => row.email)
      .filter((email: string) => email && email.length > 0)
      .map((email: string) => email.toLowerCase().trim());
  } catch (error) {
    linkLogger.error({ error, threadId }, "Failed to get thread participant emails");
    throw error;
  }
}

/**
 * Auto-link a thread to leads based on participant email addresses
 * Returns array of created links
 */
export async function autoLinkThreadToLeads(
  threadId: string
): Promise<EmailLeadLink[]> {
  try {
    // Get all participant emails from thread
    const emails = await getThreadParticipantEmails(threadId);
    
    if (emails.length === 0) {
      linkLogger.warn({ threadId }, "No participant emails found for thread");
      return [];
    }

    // Find matching leads for all emails
    const allMatches: LeadEmailMatch[] = [];
    for (const email of emails) {
      const matches = await findLeadsByEmail(email);
      allMatches.push(...matches);
    }

    if (allMatches.length === 0) {
      linkLogger.debug({ threadId, emails }, "No matching leads found");
      return [];
    }

    // Deduplicate by leadId, keeping highest confidence
    const uniqueMatches = allMatches.reduce((acc, match) => {
      const existing = acc.get(match.leadId);
      if (!existing || match.confidence > existing.confidence) {
        acc.set(match.leadId, match);
      }
      return acc;
    }, new Map<string, LeadEmailMatch>());

    // Create links for all matches
    const links: EmailLeadLink[] = [];
    for (const match of uniqueMatches.values()) {
      const link = await linkThreadToLead(
        threadId,
        match.leadId,
        null, // No user (auto-link)
        "auto",
        match.confidence
      );
      if (link) {
        links.push(link);
      }
    }

    linkLogger.info(
      { threadId, linkCount: links.length, emails },
      "Auto-linked thread to leads"
    );

    return links;
  } catch (error) {
    linkLogger.error({ error, threadId }, "Failed to auto-link thread");
    throw error;
  }
}

/**
 * Manually link a thread to a lead
 */
export async function linkThreadToLead(
  threadId: string,
  leadId: string,
  userId: string | null = null,
  linkSource: "auto" | "manual" | "imported" = "manual",
  confidence: number | null = null
): Promise<EmailLeadLink | null> {
  const query = `
    INSERT INTO email_lead_links (
      id,
      thread_id,
      lead_id,
      link_type,
      created_by,
      created_at
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
    ON CONFLICT (thread_id, lead_id) DO UPDATE SET
      link_type = EXCLUDED.link_type,
      created_by = COALESCE(EXCLUDED.created_by, email_lead_links.created_by)
    RETURNING 
      id,
      thread_id as "threadId",
      lead_id as "leadId",
      created_by as "linkedByUserId",
      link_type as "linkSource",
      ${confidence} as "confidenceScore",
      created_at as "createdAt",
      created_at as "updatedAt"
  `;

  try {
    const result = await pool!.query(query, [
      threadId,
      leadId,
      linkSource,
      userId,
    ]);

    const link = result.rows[0];
    
    linkLogger.info(
      { threadId, leadId, linkSource },
      "Linked thread to lead"
    );
    
    return link || null;
  } catch (error) {
    linkLogger.error({ error, threadId, leadId }, "Failed to link thread to lead");
    throw error;
  }
}

/**
 * Unlink a thread from a lead
 */
export async function unlinkThreadFromLead(
  threadId: string,
  leadId: string
): Promise<boolean> {
  const query = `
    DELETE FROM email_lead_links
    WHERE thread_id = $1 AND lead_id = $2
  `;

  try {
    const result = await pool!.query(query, [threadId, leadId]);
    const deleted = (result.rowCount || 0) > 0;
    
    if (deleted) {
      linkLogger.info({ threadId, leadId }, "Unlinked thread from lead");
    }
    
    return deleted;
  } catch (error) {
    linkLogger.error({ error, threadId, leadId }, "Failed to unlink thread from lead");
    throw error;
  }
}

/**
 * Get all leads linked to a thread
 */
export async function getThreadLeads(threadId: string): Promise<string[]> {
  const query = `
    SELECT lead_id
    FROM email_lead_links
    WHERE thread_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool!.query(query, [threadId]);
    return result.rows.map((row: any) => row.lead_id);
  } catch (error) {
    linkLogger.error({ error, threadId }, "Failed to get thread leads");
    throw error;
  }
}

/**
 * Get all threads linked to a lead
 */
export async function getLeadThreads(leadId: string): Promise<string[]> {
  const query = `
    SELECT thread_id
    FROM email_lead_links
    WHERE lead_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool!.query(query, [leadId]);
    return result.rows.map((row: any) => row.thread_id);
  } catch (error) {
    linkLogger.error({ error, leadId }, "Failed to get lead threads");
    throw error;
  }
}

/**
 * Sync lead email addresses from contact record
 * Extracts emails from payload and contact
 */
export async function syncLeadEmails(leadId: string): Promise<string[]> {
  if (!pool) {
    linkLogger.warn("Database pool not available");
    return [];
  }

  // Get all emails from lead's payload (crmLeads schema)
  const query = `
    SELECT 
      l.payload
    FROM crm_leads l
    WHERE l.id = $1;
  `;

  try {
    const result = await pool.query(query, [leadId]);
    
    if (result.rows.length === 0) {
      return [];
    }

    const lead = result.rows[0];
    const emails = new Set<string>();

    // Extract emails from payload JSONB
    if (lead.payload && typeof lead.payload === "object") {
      const extractEmails = (obj: any) => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === "string" && value.includes("@")) {
            emails.add(value.toLowerCase());
          } else if (Array.isArray(value)) {
            value.forEach((item) => {
              if (typeof item === "string" && item.includes("@")) {
                emails.add(item.toLowerCase());
              } else if (typeof item === "object" && item !== null) {
                extractEmails(item);
              }
            });
          } else if (typeof value === "object" && value !== null) {
            extractEmails(value);
          }
        }
      };
      extractEmails(lead.payload);
    }

    return Array.from(emails);
  } catch (error) {
    linkLogger.error({ error, leadId }, "Failed to sync lead emails");
    throw error;
  }
}

/**
 * Bulk sync emails for all leads
 * Useful for initial migration or maintenance
 */
export async function syncAllLeadEmails(): Promise<number> {
  const query = `
    UPDATE crm_leads
    SET 
      primary_email = COALESCE(
        (payload->>'email')::text,
        c.email,
        primary_email
      ),
      secondary_emails = ARRAY(
        SELECT DISTINCT email_value
        FROM unnest(
          ARRAY[
            (crm_leads.payload->>'email')::text,
            (crm_leads.payload->>'workEmail')::text,
            (crm_leads.payload->>'personalEmail')::text,
            c.email
          ]
        ) AS email_value
        WHERE email_value IS NOT NULL
      )
    FROM crm_contacts c
    WHERE crm_leads.contact_id = c.id OR crm_leads.contact_id IS NULL
    RETURNING crm_leads.id
  `;

  try {
    const result = await pool!.query(query);
    const count = result.rowCount || 0;
    
    linkLogger.info({ count }, "Synced all lead emails");
    
    return count;
  } catch (error) {
    linkLogger.error({ error }, "Failed to sync all lead emails");
    throw error;
  }
}
