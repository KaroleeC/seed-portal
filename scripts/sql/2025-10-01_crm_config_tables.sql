-- Create CRM lead configuration tables (additive-only)
CREATE TABLE IF NOT EXISTS crm_lead_sources (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS crm_lead_statuses (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS crm_lead_stages (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Optional helper indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_sources_active ON crm_lead_sources (is_active, sort_order);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_lead_statuses_active ON crm_lead_statuses (is_active, sort_order);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_lead_stages_active ON crm_lead_stages (is_active, sort_order);
