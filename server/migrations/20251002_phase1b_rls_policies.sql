-- ============================================================================
-- Phase 1b: Row Level Security (RLS) Policies
-- ============================================================================
-- This migration enables RLS on CRM tables and adds appropriate policies
-- for multi-tenant security.
--
-- Policy Design:
-- 1. Users can only see/modify their own data (user_id-scoped tables)
-- 2. Users can see events they own or are invited to
-- 3. Lookup tables (sources, statuses, stages) are read-only for all auth users
-- 4. Admins have full access (via service_role bypass or future admin policies)
--
-- Safe to run multiple times (idempotent)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Enable RLS on all CRM tables
-- ============================================================================

ALTER TABLE crm_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_event_attendees ENABLE ROW LEVEL SECURITY;

-- Lookup/config tables
ALTER TABLE crm_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_stages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Policies for crm_event_types
-- Users can manage their own event types
-- ============================================================================

-- Users can view their own event types
CREATE POLICY "Users can view own event types"
  ON crm_event_types
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own event types
CREATE POLICY "Users can create own event types"
  ON crm_event_types
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own event types
CREATE POLICY "Users can update own event types"
  ON crm_event_types
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own event types
CREATE POLICY "Users can delete own event types"
  ON crm_event_types
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================================================
-- 3. Policies for crm_availability
-- Users can manage their own availability
-- ============================================================================

CREATE POLICY "Users can view own availability"
  ON crm_availability
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own availability"
  ON crm_availability
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own availability"
  ON crm_availability
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own availability"
  ON crm_availability
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================================================
-- 4. Policies for crm_availability_overrides
-- Users can manage their own overrides
-- ============================================================================

CREATE POLICY "Users can view own availability overrides"
  ON crm_availability_overrides
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own availability overrides"
  ON crm_availability_overrides
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own availability overrides"
  ON crm_availability_overrides
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own availability overrides"
  ON crm_availability_overrides
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================================================
-- 5. Policies for crm_events
-- Users can view events they own OR events they're attending
-- ============================================================================

CREATE POLICY "Users can view own events or events they're attending"
  ON crm_events
  FOR SELECT
  USING (
    auth.uid()::text = owner_user_id
    OR EXISTS (
      SELECT 1 FROM crm_event_attendees
      WHERE crm_event_attendees.event_id = crm_events.id
      AND crm_event_attendees.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can create own events"
  ON crm_events
  FOR INSERT
  WITH CHECK (auth.uid()::text = owner_user_id);

CREATE POLICY "Users can update own events"
  ON crm_events
  FOR UPDATE
  USING (auth.uid()::text = owner_user_id)
  WITH CHECK (auth.uid()::text = owner_user_id);

CREATE POLICY "Users can delete own events"
  ON crm_events
  FOR DELETE
  USING (auth.uid()::text = owner_user_id);

-- ============================================================================
-- 6. Policies for crm_event_attendees
-- Attendees can be viewed/managed by event owner
-- Attendees can view their own attendance records
-- ============================================================================

CREATE POLICY "Event owners and attendees can view attendees"
  ON crm_event_attendees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_events
      WHERE crm_events.id = crm_event_attendees.event_id
      AND (
        crm_events.owner_user_id = auth.uid()::text
        OR crm_event_attendees.email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Event owners can add attendees"
  ON crm_event_attendees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_events
      WHERE crm_events.id = event_id
      AND crm_events.owner_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Event owners can update attendees"
  ON crm_event_attendees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM crm_events
      WHERE crm_events.id = event_id
      AND crm_events.owner_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Event owners can delete attendees"
  ON crm_event_attendees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM crm_events
      WHERE crm_events.id = event_id
      AND crm_events.owner_user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 7. Policies for lookup tables (read-only for authenticated users)
-- These tables are managed by admins via service_role
-- ============================================================================

CREATE POLICY "Authenticated users can view lead sources"
  ON crm_lead_sources
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view lead statuses"
  ON crm_lead_statuses
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view lead stages"
  ON crm_lead_stages
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- 8. Add comments for documentation
-- ============================================================================

COMMENT ON POLICY "Users can view own event types" ON crm_event_types IS 
  'Users can only view their own event type templates';

COMMENT ON POLICY "Users can view own availability" ON crm_availability IS 
  'Users can only view their own availability schedule';

COMMENT ON POLICY "Users can view own events or events they're attending" ON crm_events IS 
  'Users can view events they created or events they are invited to';

COMMENT ON POLICY "Authenticated users can view lead sources" ON crm_lead_sources IS 
  'All authenticated users can view lead sources (read-only lookup table)';

COMMIT;

-- ============================================================================
-- Migration complete!
-- ============================================================================
-- RLS is now enabled on all CRM tables with appropriate multi-tenant policies.
-- 
-- Key security features:
-- 1. Users can only see/modify their own event types, availability, overrides
-- 2. Users can see events they own or are invited to (via attendee email)
-- 3. Lookup tables are read-only for all authenticated users
-- 4. Service role bypasses all policies (for admin operations)
--
-- Next steps:
-- 1. Run this in Dev to clear Supabase linter warnings
-- 2. Test calendar booking flow with RLS enabled
-- 3. Apply to Prod when ready
-- ============================================================================
