-- Migration: Add indexes for deals/commissions/invoices/subscriptions and a trigger to maintain owner mapping invariants
-- This migration targets Supabase Postgres via Drizzle ORM.
-- Safe to run multiple times thanks to IF NOT EXISTS / OR REPLACE.

-- =============================
-- Indexes for users (HubSpot owner mapping)
-- =============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    CREATE INDEX IF NOT EXISTS users_hubspot_user_id_idx
      ON public.users (hubspot_user_id);
  END IF;
END$$;

-- =============================
-- Indexes for deals (BFF filtering and sorting)
-- =============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deals'
  ) THEN
    CREATE INDEX IF NOT EXISTS deals_hubspot_owner_id_idx
      ON public.deals (hubspot_owner_id);
    CREATE INDEX IF NOT EXISTS deals_owner_id_idx
      ON public.deals (owner_id);
    CREATE INDEX IF NOT EXISTS deals_closed_date_idx
      ON public.deals (closed_date);
  END IF;
END$$;

-- Note: hubspot_deal_id already has a UNIQUE constraint in schema; no extra index needed.

-- =============================
-- Indexes for commissions
-- =============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'commissions'
  ) THEN
    CREATE INDEX IF NOT EXISTS commissions_sales_rep_id_idx
      ON public.commissions (sales_rep_id);
    CREATE INDEX IF NOT EXISTS commissions_date_earned_idx
      ON public.commissions (date_earned);
  END IF;
END$$;

-- =============================
-- Indexes for HubSpot invoices/subscriptions
-- =============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hubspot_invoices'
  ) THEN
    CREATE INDEX IF NOT EXISTS hubspot_invoices_sales_rep_id_idx
      ON public.hubspot_invoices (sales_rep_id);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hubspot_subscriptions'
  ) THEN
    CREATE INDEX IF NOT EXISTS hubspot_subscriptions_sales_rep_id_idx
      ON public.hubspot_subscriptions (sales_rep_id);
  END IF;
END$$;

-- =============================
-- Trigger to keep deals.owner_id and deals.hubspot_owner_id in sync
-- =============================
-- Behavior:
-- 1) If NEW.hubspot_owner_id is present and NEW.owner_id is NULL or mismatched, we attempt to set owner_id by lookup on users.hubspot_user_id.
-- 2) If NEW.owner_id is present and NEW.hubspot_owner_id is NULL, we backfill hubspot_owner_id from users.hubspot_user_id.
-- 3) If no matching user exists for (1), we leave owner_id unchanged to avoid violating NOT NULL constraints.

CREATE OR REPLACE FUNCTION public.sync_deals_owner_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _uid integer;
  _hubspot_uid text;
BEGIN
  -- Case 1: hubspot_owner_id is provided
  IF NEW.hubspot_owner_id IS NOT NULL THEN
    -- If owner_id is NULL or mismatched to the provided hubspot_owner_id, try to resolve it
    IF NEW.owner_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = NEW.owner_id
        AND u.hubspot_user_id = NEW.hubspot_owner_id
    ) THEN
      SELECT u.id INTO _uid
      FROM public.users u
      WHERE u.hubspot_user_id = NEW.hubspot_owner_id
      ORDER BY u.id
      LIMIT 1;

      IF _uid IS NOT NULL THEN
        NEW.owner_id := _uid;
      END IF;
    END IF;
  END IF;

  -- Case 2: owner_id is provided but hubspot_owner_id is NULL -> backfill from users
  IF NEW.hubspot_owner_id IS NULL AND NEW.owner_id IS NOT NULL THEN
    SELECT u.hubspot_user_id INTO _hubspot_uid
    FROM public.users u
    WHERE u.id = NEW.owner_id
    LIMIT 1;

    IF _hubspot_uid IS NOT NULL THEN
      NEW.hubspot_owner_id := _hubspot_uid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deals'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deals' AND column_name = 'hubspot_owner_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deals' AND column_name = 'owner_id'
  ) THEN
    -- Drop trigger if it exists
    IF EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'trg_sync_deals_owner_fields'
        AND n.nspname = 'public'
        AND c.relname = 'deals'
    ) THEN
      EXECUTE 'DROP TRIGGER trg_sync_deals_owner_fields ON public.deals';
    END IF;

    EXECUTE 'CREATE TRIGGER trg_sync_deals_owner_fields BEFORE INSERT OR UPDATE OF hubspot_owner_id, owner_id ON public.deals FOR EACH ROW EXECUTE FUNCTION public.sync_deals_owner_fields()';
  END IF;
END$$;
