-- Additive-only schema sync: align preview/prod DB to dev schema
-- Safe operations only: CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- No drops, type changes, or NOT NULL additions without defaults beyond start_date in sales_reps (matches dev schema)

-- USERS: ensure fields used by hubspot-sync exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS hubspot_user_id text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- SALES_REPS (core to commissions)
CREATE TABLE IF NOT EXISTS sales_reps (
  id serial PRIMARY KEY
);
ALTER TABLE sales_reps
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_date timestamp DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS end_date timestamp,
  ADD COLUMN IF NOT EXISTS total_clients_closed_monthly integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clients_closed_all_time integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- HUBSPOT_INVOICES (commission source of truth)
CREATE TABLE IF NOT EXISTS hubspot_invoices (
  id serial PRIMARY KEY
);
ALTER TABLE hubspot_invoices
  ADD COLUMN IF NOT EXISTS hubspot_invoice_id text,
  ADD COLUMN IF NOT EXISTS hubspot_deal_id text,
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text,
  ADD COLUMN IF NOT EXISTS sales_rep_id integer,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_date timestamp,
  ADD COLUMN IF NOT EXISTS due_date timestamp,
  ADD COLUMN IF NOT EXISTS paid_date timestamp,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS is_processed_for_commission boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- HUBSPOT_INVOICE_LINE_ITEMS (detailed commission calc)
CREATE TABLE IF NOT EXISTS hubspot_invoice_line_items (
  id serial PRIMARY KEY
);
ALTER TABLE hubspot_invoice_line_items
  ADD COLUMN IF NOT EXISTS invoice_id integer,
  ADD COLUMN IF NOT EXISTS hubspot_line_item_id text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS quantity numeric(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();

-- HUBSPOT_SUBSCRIPTIONS (for residuals)
CREATE TABLE IF NOT EXISTS hubspot_subscriptions (
  id serial PRIMARY KEY
);
ALTER TABLE hubspot_subscriptions
  ADD COLUMN IF NOT EXISTS hubspot_subscription_id text,
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text,
  ADD COLUMN IF NOT EXISTS hubspot_deal_id text,
  ADD COLUMN IF NOT EXISTS sales_rep_id integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS monthly_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS start_date timestamp,
  ADD COLUMN IF NOT EXISTS end_date timestamp,
  ADD COLUMN IF NOT EXISTS last_invoice_date timestamp,
  ADD COLUMN IF NOT EXISTS next_invoice_date timestamp,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS service_description text,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS commissions (
  id serial PRIMARY KEY
);
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS deal_id integer,
  ADD COLUMN IF NOT EXISTS hubspot_invoice_id integer,
  ADD COLUMN IF NOT EXISTS hubspot_subscription_id integer,
  ADD COLUMN IF NOT EXISTS monthly_bonus_id integer,
  ADD COLUMN IF NOT EXISTS milestone_bonus_id integer,
  ADD COLUMN IF NOT EXISTS sales_rep_id integer,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS month_number integer,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS date_earned timestamp,
  ADD COLUMN IF NOT EXISTS date_paid timestamp,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- MONTHLY BONUSES
CREATE TABLE IF NOT EXISTS monthly_bonuses (
  id serial PRIMARY KEY
);
ALTER TABLE monthly_bonuses
  ADD COLUMN IF NOT EXISTS sales_rep_id integer,
  ADD COLUMN IF NOT EXISTS month text,
  ADD COLUMN IF NOT EXISTS clients_closed_count integer,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS bonus_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS date_earned timestamp,
  ADD COLUMN IF NOT EXISTS date_paid timestamp,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- MILESTONE BONUSES
CREATE TABLE IF NOT EXISTS milestone_bonuses (
  id serial PRIMARY KEY
);
ALTER TABLE milestone_bonuses
  ADD COLUMN IF NOT EXISTS sales_rep_id integer,
  ADD COLUMN IF NOT EXISTS milestone integer,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS includes_equity boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS date_earned timestamp,
  ADD COLUMN IF NOT EXISTS date_paid timestamp,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- COMMISSION ADJUSTMENTS
CREATE TABLE IF NOT EXISTS commission_adjustments (
  id serial PRIMARY KEY
);
ALTER TABLE commission_adjustments
  ADD COLUMN IF NOT EXISTS commission_id integer,
  ADD COLUMN IF NOT EXISTS requested_by integer,
  ADD COLUMN IF NOT EXISTS approved_by integer,
  ADD COLUMN IF NOT EXISTS original_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS requested_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'request',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS requested_date timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS reviewed_date timestamp,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- CALCULATOR SERVICE CONTENT
CREATE TABLE IF NOT EXISTS calculator_service_content (
  id serial PRIMARY KEY,
  service text NOT NULL UNIQUE,
  sow_title text,
  sow_template text,
  agreement_link text,
  included_fields_json text,
  updated_by integer,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);
