-- ============================================================================
-- Phase 4A: Scheduler Defaults & Meeting Modes
-- ============================================================================
-- Adds meeting_mode and default constraints:
--   - crm_event_types: meeting_mode, min_lead_minutes=120, max_horizon_days=14,
--                      set buffer_before_min & buffer_after_min default 15
--   - crm_events: meeting_mode
--   - crm_scheduling_links: meeting_mode (optional), min_lead_minutes, max_horizon_days (optional overrides)
-- ============================================================================
BEGIN;

-- crm_event_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_event_types' AND column_name='meeting_mode'
  ) THEN
    ALTER TABLE crm_event_types ADD COLUMN meeting_mode TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_event_types' AND column_name='min_lead_minutes'
  ) THEN
    ALTER TABLE crm_event_types ADD COLUMN min_lead_minutes INTEGER NOT NULL DEFAULT 120;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_event_types' AND column_name='max_horizon_days'
  ) THEN
    ALTER TABLE crm_event_types ADD COLUMN max_horizon_days INTEGER NOT NULL DEFAULT 14;
  END IF;
END $$;

-- set default buffers to 15 (do not overwrite existing values)
ALTER TABLE crm_event_types ALTER COLUMN buffer_before_min SET DEFAULT 15;
ALTER TABLE crm_event_types ALTER COLUMN buffer_after_min SET DEFAULT 15;

-- Optional check for meeting_mode values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_event_types_meeting_mode'
  ) THEN
    ALTER TABLE crm_event_types ADD CONSTRAINT chk_crm_event_types_meeting_mode
    CHECK (meeting_mode IS NULL OR meeting_mode IN ('in_person','phone','video'));
  END IF;
END $$;

-- crm_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_events' AND column_name='meeting_mode'
  ) THEN
    ALTER TABLE crm_events ADD COLUMN meeting_mode TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_events_meeting_mode'
  ) THEN
    ALTER TABLE crm_events ADD CONSTRAINT chk_crm_events_meeting_mode
    CHECK (meeting_mode IS NULL OR meeting_mode IN ('in_person','phone','video'));
  END IF;
END $$;

-- crm_scheduling_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_scheduling_links' AND column_name='meeting_mode'
  ) THEN
    ALTER TABLE crm_scheduling_links ADD COLUMN meeting_mode TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_scheduling_links' AND column_name='min_lead_minutes'
  ) THEN
    ALTER TABLE crm_scheduling_links ADD COLUMN min_lead_minutes INTEGER;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='crm_scheduling_links' AND column_name='max_horizon_days'
  ) THEN
    ALTER TABLE crm_scheduling_links ADD COLUMN max_horizon_days INTEGER;
  END IF;
END $$;

-- Optional check for meeting_mode values on links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_crm_scheduling_links_meeting_mode'
  ) THEN
    ALTER TABLE crm_scheduling_links ADD CONSTRAINT chk_crm_scheduling_links_meeting_mode
    CHECK (meeting_mode IS NULL OR meeting_mode IN ('in_person','phone','video'));
  END IF;
END $$;

COMMIT;
