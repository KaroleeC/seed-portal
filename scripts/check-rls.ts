import pg from "pg";

const { Client } = pg as any;

const tables = [
  "sales_reps",
  "commissions",
  "milestone_bonuses",
  "monthly_bonuses",
  "calculator_service_content",
  "roles",
  "role_permissions",
  "permissions",
  "user_roles",
  "box_folders",
  "approval_codes",
  "client_activities",
  "deals",
  "hubspot_debug",
  "kb_article_versions",
  "document_templates",
  "hubspot_subscriptions",
  "hubspot_invoice_line_items",
  "kb_bookmarks",
  "pricing_history",
  "pricing_base",
  "pricing_industry_multipliers",
  "kb_articles",
  "kb_categories",
  "kb_search_history",
  "pricing_revenue_multipliers",
  "pricing_service_settings",
  "pricing_tiers",
  "pricing_transaction_surcharges",
  "quotes",
  "session",
  "user_departments",
  "workspace_users",
  "commission_adjustments",
  "hubspot_invoices",
  "users",
  "departments",
  "manager_edges",
];

async function main() {
  const envLabel = process.argv[2] || "unknown";
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(`DATABASE_URL is not set for env: ${envLabel}`);
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const results: Record<string, any> = {};
    for (const t of tables) {
      const rlsRes = await client.query(
        `SELECT c.relrowsecurity AS rls_enabled
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname='public' AND c.relname=$1 AND c.relkind='r'`,
        [t]
      );
      const rls_enabled = rlsRes.rows?.[0]?.rls_enabled ?? null;
      const polRes = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM pg_policies WHERE schemaname='public' AND tablename=$1`,
        [t]
      );
      const policies = polRes.rows?.[0]?.count ?? 0;
      results[t] = { rls_enabled, policies };
    }
    console.log(JSON.stringify({ env: envLabel, tables: results }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("check-rls-error", { message: err?.message });
  process.exit(1);
});
