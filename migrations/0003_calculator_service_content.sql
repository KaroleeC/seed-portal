-- Migration: Create calculator_service_content for SOW templates and agreement links
-- Safe to run multiple times with IF NOT EXISTS

CREATE TABLE IF NOT EXISTS public.calculator_service_content (
  id SERIAL PRIMARY KEY,
  service TEXT NOT NULL UNIQUE,
  sow_title TEXT,
  sow_template TEXT,
  agreement_link TEXT,
  included_fields_json TEXT,
  updated_by INTEGER REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Helpful index for lookups by service
CREATE INDEX IF NOT EXISTS calculator_service_content_service_idx
  ON public.calculator_service_content (service);

-- Optional: Ensure updated_at auto-updates if helper exists; otherwise skip
DO $$
DECLARE
  fn_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
  ) INTO fn_exists;

  IF fn_exists THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'trg_calculator_service_content_updated_at'
        AND n.nspname = 'public'
        AND c.relname = 'calculator_service_content'
    ) THEN
      EXECUTE 'CREATE TRIGGER trg_calculator_service_content_updated_at
               BEFORE UPDATE ON public.calculator_service_content
               FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();';
    END IF;
  END IF;
END$$;
