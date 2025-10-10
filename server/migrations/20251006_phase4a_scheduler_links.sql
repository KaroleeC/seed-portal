-- ============================================================================
-- Phase 4A: Scheduler - Shareable Links
-- ============================================================================
-- Adds crm_scheduling_links table for client-facing booking links
-- Safe to run multiple times (idempotent)
-- ============================================================================

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS crm_scheduling_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_user_id TEXT NOT NULL,
  event_type_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  token_hash TEXT,
  expires_at TIMESTAMP,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  custom_availability JSONB,
  brand_theme JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_crm_scheduling_links_owner ON crm_scheduling_links(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_scheduling_links_expires ON crm_scheduling_links(expires_at);

-- Enable RLS
ALTER TABLE crm_scheduling_links ENABLE ROW LEVEL SECURITY;

-- RLS policies - owner full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can view own scheduling links' AND tablename = 'crm_scheduling_links'
  ) THEN
    CREATE POLICY "Users can view own scheduling links"
      ON crm_scheduling_links FOR SELECT
      USING (auth.uid()::text = owner_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can create own scheduling links' AND tablename = 'crm_scheduling_links'
  ) THEN
    CREATE POLICY "Users can create own scheduling links"
      ON crm_scheduling_links FOR INSERT
      WITH CHECK (auth.uid()::text = owner_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can update own scheduling links' AND tablename = 'crm_scheduling_links'
  ) THEN
    CREATE POLICY "Users can update own scheduling links"
      ON crm_scheduling_links FOR UPDATE
      USING (auth.uid()::text = owner_user_id)
      WITH CHECK (auth.uid()::text = owner_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can delete own scheduling links' AND tablename = 'crm_scheduling_links'
  ) THEN
    CREATE POLICY "Users can delete own scheduling links"
      ON crm_scheduling_links FOR DELETE
      USING (auth.uid()::text = owner_user_id);
  END IF;
END $$;

-- Comments
COMMENT ON TABLE crm_scheduling_links IS 'Shareable booking links for the Scheduler (client-facing)';
COMMENT ON COLUMN crm_scheduling_links.owner_user_id IS 'Owner user id (creator of the link)';
COMMENT ON COLUMN crm_scheduling_links.event_type_id IS 'Optional crm_event_types.id for templated events';
COMMENT ON COLUMN crm_scheduling_links.slug IS 'Public slug used in /schedule/:slug';
COMMENT ON COLUMN crm_scheduling_links.token_hash IS 'Optional signed token hash for extra security';
COMMENT ON COLUMN crm_scheduling_links.custom_availability IS 'Optional availability JSON for this link only';

COMMIT;
