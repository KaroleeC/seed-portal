-- Enable RLS and add service_role policy for remaining flagged tables

-- hubspot_debug
ALTER TABLE IF EXISTS public.hubspot_debug ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.hubspot_debug') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.hubspot_debug
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- session
ALTER TABLE IF EXISTS public.session ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.session') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.session
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
