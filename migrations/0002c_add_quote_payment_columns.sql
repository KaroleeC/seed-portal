-- Add signing/payment columns to quotes (idempotent)
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS signed_at timestamp;
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS signed_by_name text;
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS signed_ip text;
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS paid_at timestamp;
ALTER TABLE IF EXISTS public.quotes ADD COLUMN IF NOT EXISTS payment_status text;
