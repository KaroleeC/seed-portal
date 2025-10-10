-- Enable RLS and add service_role full-access policy for flagged public tables
-- Policies are created idempotently via duplicate_object exception handling

-- Helper: enable RLS and create a service_role policy for a table
-- Usage pattern repeated per table below

-- sales_reps
ALTER TABLE IF EXISTS public.sales_reps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.sales_reps
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- commissions
ALTER TABLE IF EXISTS public.commissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.commissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- milestone_bonuses
ALTER TABLE IF EXISTS public.milestone_bonuses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.milestone_bonuses
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- monthly_bonuses
ALTER TABLE IF EXISTS public.monthly_bonuses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.monthly_bonuses
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- calculator_service_content
ALTER TABLE IF EXISTS public.calculator_service_content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.calculator_service_content
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- roles
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- role_permissions
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.role_permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- permissions
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.user_roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- box_folders
ALTER TABLE IF EXISTS public.box_folders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.box_folders
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- approval_codes
ALTER TABLE IF EXISTS public.approval_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.approval_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- client_activities
ALTER TABLE IF EXISTS public.client_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.client_activities
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- deals
ALTER TABLE IF EXISTS public.deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.deals
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- hubspot_debug
ALTER TABLE IF EXISTS public.hubspot_debug ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.hubspot_debug
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- kb_article_versions
ALTER TABLE IF EXISTS public.kb_article_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.kb_article_versions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- document_templates
ALTER TABLE IF EXISTS public.document_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.document_templates
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- hubspot_subscriptions
ALTER TABLE IF EXISTS public.hubspot_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.hubspot_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- hubspot_invoice_line_items
ALTER TABLE IF EXISTS public.hubspot_invoice_line_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.hubspot_invoice_line_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- kb_bookmarks
ALTER TABLE IF EXISTS public.kb_bookmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.kb_bookmarks
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_history
ALTER TABLE IF EXISTS public.pricing_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_base
ALTER TABLE IF EXISTS public.pricing_base ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_base
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_industry_multipliers
ALTER TABLE IF EXISTS public.pricing_industry_multipliers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_industry_multipliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- kb_articles
ALTER TABLE IF EXISTS public.kb_articles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.kb_articles
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- kb_categories
ALTER TABLE IF EXISTS public.kb_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.kb_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- kb_search_history
ALTER TABLE IF EXISTS public.kb_search_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.kb_search_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_revenue_multipliers
ALTER TABLE IF EXISTS public.pricing_revenue_multipliers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_revenue_multipliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_service_settings
ALTER TABLE IF EXISTS public.pricing_service_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_service_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_tiers
ALTER TABLE IF EXISTS public.pricing_tiers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_tiers
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pricing_transaction_surcharges
ALTER TABLE IF EXISTS public.pricing_transaction_surcharges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.pricing_transaction_surcharges
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- quotes
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.quotes
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- session
ALTER TABLE IF EXISTS public.session ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.session
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_departments
ALTER TABLE IF EXISTS public.user_departments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.user_departments
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workspace_users
ALTER TABLE IF EXISTS public.workspace_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.workspace_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- commission_adjustments
ALTER TABLE IF EXISTS public.commission_adjustments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.commission_adjustments
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- hubspot_invoices
ALTER TABLE IF EXISTS public.hubspot_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.hubspot_invoices
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- users
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- departments
ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.departments
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- manager_edges
ALTER TABLE IF EXISTS public.manager_edges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY service_role_all ON public.manager_edges
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
