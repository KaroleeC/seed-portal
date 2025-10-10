import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Hard assert to prevent silent misconfig during development
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const msg = [
    "[Supabase] Missing client env configuration.",
    "Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be defined.",
    'Start the WEB dev server with Doppler project "seed-portal-web" (config: dev):',
    "  doppler run --project seed-portal-web --config dev -- VITE_STRICT_PORT=1 npm run dev:web",
  ].join("\n");
  throw new Error(msg);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
  },
});
