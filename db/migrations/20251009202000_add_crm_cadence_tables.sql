-- Migration: Add CRM Cadence Tables
-- Date: 2025-10-09
-- Description: Creates sales cadence automation tables
-- Tables: 6 (crm_cadences, crm_cadence_days, crm_cadence_actions, 
--            crm_cadence_runs, crm_cadence_scheduled_actions, crm_cadence_events)
-- Risk: Low (additive only)
-- Estimated time: <5 seconds

BEGIN;

-- ============================================================================
-- CRM Cadences - Sales cadence templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_cadences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  owner_user_id TEXT, -- references users.id
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  trigger JSONB, -- { type: 'lead_assigned', config: { assignedTo?: userId } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CRM Cadence Days - Days in a cadence
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_cadence_days (
  id TEXT PRIMARY KEY,
  cadence_id TEXT NOT NULL, -- references crm_cadences.id
  day_number INTEGER NOT NULL, -- 1..N
  sort_order INTEGER, -- optional explicit ordering
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_cadence_days_cadence_idx ON crm_cadence_days(cadence_id);

-- ============================================================================
-- CRM Cadence Actions - Actions to perform on each day
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_cadence_actions (
  id TEXT PRIMARY KEY,
  cadence_id TEXT NOT NULL, -- denormalized for easy joins
  day_id TEXT NOT NULL, -- references crm_cadence_days.id
  action_type TEXT NOT NULL, -- 'sms' | 'email' | 'call_task'
  schedule_rule JSONB NOT NULL, -- { kind, timeOfDay?, minutesAfterPrev? }
  config JSONB, -- channel-specific config
  sort_order INTEGER, -- 0..N inside the day
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_cadence_actions_cadence_idx ON crm_cadence_actions(cadence_id);
CREATE INDEX IF NOT EXISTS crm_cadence_actions_day_idx ON crm_cadence_actions(day_id);

-- ============================================================================
-- CRM Cadence Runs - Active cadence enrollments
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_cadence_runs (
  id TEXT PRIMARY KEY,
  cadence_id TEXT NOT NULL, -- references crm_cadences.id
  lead_id TEXT NOT NULL, -- references crm_leads.id
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'stopped'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_cadence_runs_cadence_idx ON crm_cadence_runs(cadence_id);
CREATE INDEX IF NOT EXISTS crm_cadence_runs_lead_idx ON crm_cadence_runs(lead_id);
CREATE INDEX IF NOT EXISTS crm_cadence_runs_status_idx ON crm_cadence_runs(status);

-- ============================================================================
-- CRM Cadence Scheduled Actions - Scheduled action instances
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_cadence_scheduled_actions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL, -- references crm_cadence_runs.id
  action_id TEXT NOT NULL, -- references crm_cadence_actions.id
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'sent' | 'skipped' | 'failed'
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_cadence_scheduled_actions_run_idx ON crm_cadence_scheduled_actions(run_id);
CREATE INDEX IF NOT EXISTS crm_cadence_scheduled_actions_due_at_idx ON crm_cadence_scheduled_actions(due_at);
CREATE INDEX IF NOT EXISTS crm_cadence_scheduled_actions_status_idx ON crm_cadence_scheduled_actions(status);

-- ============================================================================
-- CRM Cadence Events - Event log for cadence triggers
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_cadence_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'lead_assigned' | 'sms_inbound' | 'email_inbound' | 'lead_stage_changed' | 'meeting_booked'
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_cadence_events_type_idx ON crm_cadence_events(type);
CREATE INDEX IF NOT EXISTS crm_cadence_events_created_at_idx ON crm_cadence_events(created_at);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Run these to verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'crm_cadence%' ORDER BY table_name;
-- SELECT COUNT(*) FROM crm_cadences; -- Should return 0

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- Uncomment and run if you need to rollback:
-- BEGIN;
-- DROP TABLE IF EXISTS crm_cadence_events CASCADE;
-- DROP TABLE IF EXISTS crm_cadence_scheduled_actions CASCADE;
-- DROP TABLE IF EXISTS crm_cadence_runs CASCADE;
-- DROP TABLE IF EXISTS crm_cadence_actions CASCADE;
-- DROP TABLE IF EXISTS crm_cadence_days CASCADE;
-- DROP TABLE IF EXISTS crm_cadences CASCADE;
-- COMMIT;
