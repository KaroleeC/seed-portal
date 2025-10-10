-- Safe RLS enablement for public tables with existence checks
-- Enables RLS and creates a permissive policy for service_role only

-- Helper macro style repeated: ALTER TABLE IF EXISTS ...; DO $$ IF to_regclass(...) ... END $$;

-- ai tables
ALTER TABLE IF EXISTS public.ai_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.ai_messages') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.ai_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.ai_conversations') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.ai_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.ai_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.ai_documents') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.ai_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.ai_chunks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.ai_chunks') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.ai_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- pricing tables
ALTER TABLE IF EXISTS public.pricing_base ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_base') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_base FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.pricing_industry_multipliers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_industry_multipliers') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_industry_multipliers FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.pricing_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_history') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_history FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.pricing_revenue_multipliers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_revenue_multipliers') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_revenue_multipliers FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.pricing_service_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_service_settings') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_service_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.pricing_tiers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_tiers') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.pricing_transaction_surcharges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.pricing_transaction_surcharges') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.pricing_transaction_surcharges FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- misc public tables (approvals, docs, activities)
ALTER TABLE IF EXISTS public.approval_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.approval_codes') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.approval_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.client_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.client_documents') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.client_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.client_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.client_activities') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.client_activities FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.client_intel_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.client_intel_profiles') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.client_intel_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- commerce and hubspot
ALTER TABLE IF EXISTS public.commissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.commissions') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.commissions FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.hubspot_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.hubspot_invoices') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.hubspot_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.hubspot_invoice_line_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.hubspot_invoice_line_items') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.hubspot_invoice_line_items FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.deals') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.deals FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- knowledge base
ALTER TABLE IF EXISTS public.kb_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.kb_categories') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.kb_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.kb_bookmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.kb_bookmarks') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.kb_bookmarks FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.kb_search_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.kb_search_history') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.kb_search_history FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.kb_articles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.kb_articles') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.kb_articles FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.kb_article_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.kb_article_versions') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.kb_article_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- subscriptions and webhooks
ALTER TABLE IF EXISTS public.hubspot_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.hubspot_subscriptions') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.hubspot_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.intake_webhooks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.intake_webhooks') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.intake_webhooks FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- quotes and CRM
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.quotes') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.quotes FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.crm_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.crm_contacts') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.crm_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.crm_deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.crm_deals') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.crm_deals FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.crm_leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.crm_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.crm_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.crm_messages') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.crm_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.crm_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.crm_notes') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.crm_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.crm_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.crm_tasks') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.crm_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- identity/roles/users
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.roles') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.roles FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.role_permissions') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.role_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.permissions') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.departments') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.departments FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.user_departments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.user_departments') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.user_departments FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.manager_edges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.manager_edges') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.manager_edges FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- other tables possibly referenced
ALTER TABLE IF EXISTS public.document_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.document_templates') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.document_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.box_folders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.box_folders') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.box_folders FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
