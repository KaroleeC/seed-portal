-- 0002_deals_indexes_owner_trigger_prod.sql
-- Production-safe index creation using CONCURRENTLY. Do NOT wrap this file in a transaction.
-- Run with psql or a migration runner that does not wrap statements in a single transaction.

-- Create indexes concurrently for hot tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_hubspot_user_id ON users (hubspot_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_hubspot_owner_id ON deals (hubspot_owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_owner_id ON deals (owner_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_closed_date ON deals (closed_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_sales_rep_id ON commissions (sales_rep_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_date_earned ON commissions (date_earned);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hubspot_invoices_sales_rep_id ON hubspot_invoices (sales_rep_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hubspot_subscriptions_sales_rep_id ON hubspot_subscriptions (sales_rep_id);

-- Keep owner_id and hubspot_owner_id in sync (create or replace function is safe)
CREATE OR REPLACE FUNCTION sync_deals_owner_fields()
RETURNS trigger AS $$
BEGIN
  -- When hubspot_owner_id is provided and owner_id is null, set owner_id from users
  IF NEW.hubspot_owner_id IS NOT NULL AND (NEW.owner_id IS NULL OR NEW.owner_id = 0) THEN
    SELECT id INTO NEW.owner_id FROM users WHERE hubspot_user_id = NEW.hubspot_owner_id LIMIT 1;
  END IF;

  -- When owner_id is provided and hubspot_owner_id is null, set hubspot_owner_id from users
  IF NEW.owner_id IS NOT NULL AND (NEW.hubspot_owner_id IS NULL OR NEW.hubspot_owner_id = '') THEN
    SELECT hubspot_user_id INTO NEW.hubspot_owner_id FROM users WHERE id = NEW.owner_id LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_deals_owner_fields'
  ) THEN
    EXECUTE $$
      CREATE TRIGGER trg_sync_deals_owner_fields
      BEFORE INSERT OR UPDATE OF owner_id, hubspot_owner_id ON deals
      FOR EACH ROW
      EXECUTE FUNCTION sync_deals_owner_fields();
    $$;
  END IF;
END $$;
