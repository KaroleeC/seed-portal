-- ============================================================================
-- Phase 1: CRM Scheduling, Messages, Leads & Quotes Signing
-- ============================================================================
-- This migration adds:
-- 1. Scheduling system (event types, availability, events, attendees)
-- 2. Enhanced messaging (channel, provider, thread tracking)
-- 3. Lead lifecycle tracking (conversion, contact dates)
-- 4. Quote signing (stages, signatures, certificates)
--
-- Safe to run multiple times (idempotent)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. NEW TABLE: crm_event_types
-- Calendar event templates (e.g., "30-min Discovery Call")
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_event_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, -- references users.id (owner of this event type)
  name TEXT NOT NULL, -- e.g., "Discovery Call", "Strategy Session"
  duration_min INTEGER NOT NULL DEFAULT 30, -- duration in minutes
  buffer_before_min INTEGER NOT NULL DEFAULT 0, -- buffer before meeting
  buffer_after_min INTEGER NOT NULL DEFAULT 0, -- buffer after meeting
  meeting_link_template TEXT, -- e.g., "https://zoom.us/j/{meeting_id}"
  description TEXT, -- shown to bookers
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_event_types_user_id ON crm_event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_event_types_active ON crm_event_types(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. NEW TABLE: crm_availability
-- Recurring weekly availability for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_availability (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, -- references users.id
  weekday INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_minutes INTEGER NOT NULL, -- minutes since midnight (e.g., 540 = 9:00 AM)
  end_minutes INTEGER NOT NULL, -- minutes since midnight (e.g., 1020 = 5:00 PM)
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles', -- IANA timezone
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_weekday CHECK (weekday >= 0 AND weekday <= 6),
  CONSTRAINT valid_time_range CHECK (start_minutes >= 0 AND start_minutes < 1440 AND end_minutes > start_minutes AND end_minutes <= 1440)
);

CREATE INDEX IF NOT EXISTS idx_crm_availability_user_id ON crm_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_availability_weekday ON crm_availability(weekday);

-- ============================================================================
-- 3. NEW TABLE: crm_availability_overrides
-- One-time availability changes (e.g., "I'm off on Dec 25")
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_availability_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, -- references users.id
  date DATE NOT NULL, -- specific date for this override
  start_minutes INTEGER, -- NULL if unavailable all day
  end_minutes INTEGER, -- NULL if unavailable all day
  is_available BOOLEAN NOT NULL, -- true = working this day, false = off
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_override_time CHECK (
    (is_available = false AND start_minutes IS NULL AND end_minutes IS NULL) OR
    (is_available = true AND start_minutes IS NOT NULL AND end_minutes IS NOT NULL AND start_minutes >= 0 AND start_minutes < 1440 AND end_minutes > start_minutes AND end_minutes <= 1440)
  )
);

CREATE INDEX IF NOT EXISTS idx_crm_availability_overrides_user_date ON crm_availability_overrides(user_id, date);

-- ============================================================================
-- 4. NEW TABLE: crm_events
-- Scheduled meetings/events
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type_id TEXT, -- references crm_event_types.id (NULL for ad-hoc events)
  owner_user_id TEXT NOT NULL, -- references users.id (rep who owns this event)
  contact_id TEXT, -- references crm_contacts.id (if associated with contact)
  lead_id TEXT, -- references crm_leads.id (if associated with lead)
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  location TEXT, -- physical location or "Zoom", "Google Meet", etc.
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  meeting_link TEXT, -- actual meeting URL
  title TEXT NOT NULL, -- event title
  description TEXT, -- event notes/agenda
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_event_times CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_crm_events_owner_start ON crm_events(owner_user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_crm_events_contact_id ON crm_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_lead_id ON crm_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_status ON crm_events(status);

-- ============================================================================
-- 5. NEW TABLE: crm_event_attendees
-- Participants in events
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_event_attendees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL, -- references crm_events.id
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'attendee', -- 'organizer' | 'attendee' | 'optional'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined' | 'tentative'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_event_attendees_event_id ON crm_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_crm_event_attendees_email ON crm_event_attendees(email);

-- ============================================================================
-- 6. EXTEND TABLE: crm_leads
-- Add lifecycle tracking fields
-- ============================================================================

-- Add archived column (soft delete)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='archived') THEN
    ALTER TABLE crm_leads ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add conversion tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='converted_at') THEN
    ALTER TABLE crm_leads ADD COLUMN converted_at TIMESTAMP;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='converted_contact_id') THEN
    ALTER TABLE crm_leads ADD COLUMN converted_contact_id TEXT; -- references crm_contacts.id
  END IF;
END $$;

-- Add sales cadence tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='last_contacted_at') THEN
    ALTER TABLE crm_leads ADD COLUMN last_contacted_at TIMESTAMP;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='next_action_at') THEN
    ALTER TABLE crm_leads ADD COLUMN next_action_at TIMESTAMP;
  END IF;
END $$;

-- Add index for lead queries
CREATE INDEX IF NOT EXISTS idx_crm_leads_status_updated ON crm_leads(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_archived ON crm_leads(archived) WHERE archived = false;

-- ============================================================================
-- 7. EXTEND TABLE: crm_messages
-- Add channel, provider, thread tracking
-- ============================================================================

-- Add channel (rename from 'type' is handled separately if needed)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='channel') THEN
    -- If 'type' exists, we'll use it as channel for now (migration happens in app layer)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='type') THEN
      ALTER TABLE crm_messages RENAME COLUMN type TO channel;
    ELSE
      ALTER TABLE crm_messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'email'; -- 'email' | 'sms' | 'voice' | 'chat'
    END IF;
  END IF;
END $$;

-- Add provider field
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='provider') THEN
    ALTER TABLE crm_messages ADD COLUMN provider TEXT; -- 'mailgun' | 'twilio' | 'sendgrid'
  END IF;
END $$;

-- Add provider message ID
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='provider_message_id') THEN
    ALTER TABLE crm_messages ADD COLUMN provider_message_id TEXT; -- Twilio SID, Mailgun ID, etc.
  END IF;
END $$;

-- Add thread key for grouping messages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='thread_key') THEN
    ALTER TABLE crm_messages ADD COLUMN thread_key TEXT; -- Group related messages (email threads, SMS convos)
  END IF;
END $$;

-- Add error field
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='error') THEN
    ALTER TABLE crm_messages ADD COLUMN error TEXT; -- Error details if delivery failed
  END IF;
END $$;

-- Add raw payload
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_messages' AND column_name='raw') THEN
    ALTER TABLE crm_messages ADD COLUMN raw JSONB; -- Full provider webhook payload for debugging
  END IF;
END $$;

-- Rename providerId to legacy for clarity (optional)
-- Note: providerId already exists, so we keep it for backward compat

-- Add indexes for message queries
CREATE INDEX IF NOT EXISTS idx_crm_messages_contact_created ON crm_messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_messages_thread_key ON crm_messages(thread_key) WHERE thread_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_messages_provider_id ON crm_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- ============================================================================
-- 8. EXTEND TABLE: quotes
-- Add signing and stage tracking
-- ============================================================================

-- Add quote stage
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='quote_stage') THEN
    ALTER TABLE quotes ADD COLUMN quote_stage TEXT NOT NULL DEFAULT 'draft'; -- 'draft' | 'sent' | 'negotiation' | 'closed_won' | 'closed_lost'
  END IF;
END $$;

-- Add proposal version
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='proposal_version') THEN
    ALTER TABLE quotes ADD COLUMN proposal_version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add signature PNG path
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='signature_png_path') THEN
    ALTER TABLE quotes ADD COLUMN signature_png_path TEXT; -- Path to stored canvas signature image
  END IF;
END $$;

-- Add signature certificate JSON
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='signature_certificate_json') THEN
    ALTER TABLE quotes ADD COLUMN signature_certificate_json JSONB; -- Audit trail: {ipAddress, timestamp, signerEmail, userAgent}
  END IF;
END $$;

-- Add signed by email
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='signed_by_email') THEN
    ALTER TABLE quotes ADD COLUMN signed_by_email TEXT; -- Email of person who signed
  END IF;
END $$;

-- Add signed at timestamp
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='signed_at') THEN
    ALTER TABLE quotes ADD COLUMN signed_at TIMESTAMP; -- When quote was signed
  END IF;
END $$;

-- Add indexes for quote queries
CREATE INDEX IF NOT EXISTS idx_quotes_stage ON quotes(quote_stage);
CREATE INDEX IF NOT EXISTS idx_quotes_signed ON quotes(signed_at) WHERE signed_at IS NOT NULL;

-- ============================================================================
-- 9. ADD COMMENTS (for documentation in Supabase Studio)
-- ============================================================================

COMMENT ON TABLE crm_event_types IS 'Calendar event templates (e.g., "30-min Discovery Call")';
COMMENT ON TABLE crm_availability IS 'Recurring weekly availability for users';
COMMENT ON TABLE crm_availability_overrides IS 'One-time availability changes';
COMMENT ON TABLE crm_events IS 'Scheduled meetings and events';
COMMENT ON TABLE crm_event_attendees IS 'Participants in events';

COMMENT ON COLUMN crm_leads.archived IS 'Soft delete flag for leads';
COMMENT ON COLUMN crm_leads.converted_at IS 'When lead was converted to customer';
COMMENT ON COLUMN crm_leads.converted_contact_id IS 'Contact ID after conversion';
COMMENT ON COLUMN crm_leads.last_contacted_at IS 'Last time rep reached out';
COMMENT ON COLUMN crm_leads.next_action_at IS 'Next scheduled follow-up';

COMMENT ON COLUMN crm_messages.channel IS 'Communication channel: email, sms, voice, chat';
COMMENT ON COLUMN crm_messages.provider IS 'Service provider: mailgun, twilio, sendgrid';
COMMENT ON COLUMN crm_messages.provider_message_id IS 'External message ID from provider';
COMMENT ON COLUMN crm_messages.thread_key IS 'Groups related messages (threads/conversations)';
COMMENT ON COLUMN crm_messages.raw IS 'Full provider webhook payload for debugging';

COMMENT ON COLUMN quotes.quote_stage IS 'Quote lifecycle: draft → sent → negotiation → closed_won/lost';
COMMENT ON COLUMN quotes.signature_png_path IS 'Path to stored canvas signature image';
COMMENT ON COLUMN quotes.signature_certificate_json IS 'Audit trail: IP, timestamp, signer info';

COMMIT;

-- ============================================================================
-- Migration complete!
-- ============================================================================
-- Next steps:
-- 1. Run this in Supabase Studio SQL Editor (Dev project)
-- 2. Verify tables/columns in Studio
-- 3. Update shared/schema.ts Drizzle definitions
-- 4. Test API server startup
-- 5. Apply to Prod when ready
-- ============================================================================
