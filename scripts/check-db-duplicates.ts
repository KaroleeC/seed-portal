import pg from "pg";

const { Client } = pg as any;

async function tableExists(client: pg.Client, name: string) {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name=$1
     ) AS exists`,
    [name]
  );
  return rows[0]?.exists === true;
}

async function columnsExist(client: pg.Client, table: string, columns: string[]) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2)`,
    [table, columns]
  );
  const present = new Set(rows.map((r: any) => r.column_name));
  const missing = columns.filter((c) => !present.has(c));
  return { present: Array.from(present), missing };
}

async function duplicateGroups(
  client: pg.Client,
  table: string,
  column: string,
  whereNotNull = true
) {
  const where = whereNotNull ? `${column} IS NOT NULL` : `TRUE`;
  const { rows } = await client.query(
    `SELECT COUNT(*) AS group_count FROM (
       SELECT ${column}
       FROM ${table}
       WHERE ${where}
       GROUP BY ${column}
       HAVING COUNT(*) > 1
     ) t`
  );
  const groups = Number(rows?.[0]?.group_count || 0);
  let samples: any[] = [];
  if (groups > 0) {
    const { rows: sampleRows } = await client.query(
      `SELECT ${column} AS value, COUNT(*) AS c
       FROM ${table}
       WHERE ${where}
       GROUP BY ${column}
       HAVING COUNT(*) > 1
       ORDER BY c DESC
       LIMIT 5`
    );
    samples = sampleRows;
  }
  return { groups, samples };
}

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
    // Check new CRM tables
    const crmTables = [
      "crm_contacts",
      "crm_leads",
      "crm_deals",
      "crm_notes",
      "crm_tasks",
      "crm_messages",
      "intake_webhooks",
    ];
    const exists: Record<string, boolean> = {};
    for (const t of crmTables) {
      exists[t] = await tableExists(client, t);
    }

    // Check quotes new columns
    const quotesCols = [
      "signed_at",
      "signed_by_name",
      "signed_ip",
      "stripe_checkout_session_id",
      "stripe_payment_intent_id",
      "paid_at",
      "payment_status",
    ];
    const quotesColumns = await columnsExist(client, "quotes", quotesCols);

    // Duplicates
    const dupDeals = (await tableExists(client, "deals"))
      ? await duplicateGroups(client, "deals", "hubspot_deal_id", true)
      : { groups: 0, samples: [] };
    const dupQuotes = (await tableExists(client, "quotes"))
      ? await duplicateGroups(client, "quotes", "hubspot_quote_id", true)
      : { groups: 0, samples: [] };
    const dupUsers = (await tableExists(client, "users"))
      ? await duplicateGroups(client, "users", "email", true)
      : { groups: 0, samples: [] };
    const dupWorkspaceUsers = (await tableExists(client, "workspace_users"))
      ? await duplicateGroups(client, "workspace_users", "email", true)
      : { groups: 0, samples: [] };
    const dupCrmContacts = exists["crm_contacts"]
      ? await duplicateGroups(client, "crm_contacts", "email", true)
      : { groups: 0, samples: [] };

    const summary = {
      env: envLabel,
      crmTables: exists,
      quotesColumns,
      duplicates: {
        deals_hubspot_deal_id: dupDeals,
        quotes_hubspot_quote_id: dupQuotes,
        users_email: dupUsers,
        workspace_users_email: dupWorkspaceUsers,
        crm_contacts_email: dupCrmContacts,
      },
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("db-check-error", { message: err?.message });
  process.exit(1);
});
