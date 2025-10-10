-- Enable RLS + service_role policy for remaining public tables

-- milestone_bonuses
ALTER TABLE IF EXISTS public.milestone_bonuses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.milestone_bonuses') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.milestone_bonuses FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- workspace_users
ALTER TABLE IF EXISTS public.workspace_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.workspace_users') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.workspace_users FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- commission_adjustments
ALTER TABLE IF EXISTS public.commission_adjustments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.commission_adjustments') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.commission_adjustments FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- monthly_bonuses
ALTER TABLE IF EXISTS public.monthly_bonuses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.monthly_bonuses') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.monthly_bonuses FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- sales_reps
ALTER TABLE IF EXISTS public.sales_reps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.sales_reps') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.sales_reps FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- calculator_service_content
ALTER TABLE IF EXISTS public.calculator_service_content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF to_regclass('public.calculator_service_content') IS NOT NULL THEN
    BEGIN
      CREATE POLICY service_role_all ON public.calculator_service_content FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
