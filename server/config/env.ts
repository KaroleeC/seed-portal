import { z } from "zod";

// Centralized runtime environment validation
// Do not import this in client code; server-only

export const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().optional(),

  // Core infrastructure
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional(),
  REDIS_URL: z.string().optional(),

  // Integrations
  HUBSPOT_ACCESS_TOKEN: z.string().min(1, "HUBSPOT_ACCESS_TOKEN is required").optional(),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required").optional(),
  SENTRY_DSN: z.string().url().optional(),
  SLACK_CHANNEL_ID: z.string().optional(),
  // Webhooks (Zapier)
  ZAPIER_WEBHOOK_SECRET: z.string().optional(),
  ZAPIER_ALLOWED_IPS: z.string().optional(),

  // Misc
  APP_VERSION: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    // We do not hard-crash in development to allow partial bring-up
    const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
    const msg = `Invalid environment configuration: ${issues}`;
    if (isProd) {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }
  return parsed.success ? parsed.data : (process.env as any);
}

// Helper for feature-gating critical envs
export function requireEnv(keys: (keyof Env)[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
