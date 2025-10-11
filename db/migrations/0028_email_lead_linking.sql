-- Email-Lead Linking
-- Migration: 0028_email_lead_linking
-- Description: Link SEEDMAIL threads/messages to LEADIQ leads

-- Email Thread -> Lead linking table
CREATE TABLE IF NOT EXISTS email_lead_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id TEXT NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL,
  linked_by_user_id TEXT, -- User who manually linked (NULL for auto-link)
  link_source TEXT NOT NULL DEFAULT 'auto', -- 'auto' | 'manual' | 'imported'
  confidence_score DECIMAL(3,2), -- 0.00-1.00 for auto-linking confidence
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate links
  UNIQUE(thread_id, lead_id)
);

CREATE INDEX IF NOT EXISTS email_lead_links_thread_idx ON email_lead_links(thread_id);
CREATE INDEX IF NOT EXISTS email_lead_links_lead_idx ON email_lead_links(lead_id);
CREATE INDEX IF NOT EXISTS email_lead_links_link_source_idx ON email_lead_links(link_source);

-- Add email tracking columns to crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS primary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_emails TEXT[];

-- Create index on primary_email for fast lookups
CREATE INDEX IF NOT EXISTS idx_crm_leads_primary_email ON crm_leads(primary_email) WHERE primary_email IS NOT NULL;

-- Create GIN index for secondary_emails array
CREATE INDEX IF NOT EXISTS idx_crm_leads_secondary_emails ON crm_leads USING GIN(secondary_emails) WHERE secondary_emails IS NOT NULL;

-- Comments
COMMENT ON TABLE email_lead_links IS 'Links SEEDMAIL email threads to LEADIQ leads for CRM integration';
COMMENT ON COLUMN email_lead_links.link_source IS 'How the link was created: auto (email match), manual (user action), imported (bulk)';
COMMENT ON COLUMN email_lead_links.confidence_score IS 'Auto-linking confidence (0.00-1.00): 1.00=exact match, 0.80=domain match, etc.';
COMMENT ON COLUMN crm_leads.primary_email IS 'Primary email address extracted from payload or contact';
COMMENT ON COLUMN crm_leads.secondary_emails IS 'Additional email addresses associated with this lead';
