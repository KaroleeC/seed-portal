/**
 * Sync Lead Emails Script
 * 
 * One-time script to populate email columns on crm_leads table
 * Extracts emails from payload and contact records
 * 
 * Run with: NODE_ENV=development tsx scripts/sync-lead-emails.ts
 */

import { syncAllLeadEmails } from "../server/services/email-lead-linking.service";

async function main() {
  console.log("🔄 Starting lead email sync...\n");

  try {
    const count = await syncAllLeadEmails();

    console.log("\n✅ Lead email sync complete!");
    console.log(`📊 Updated ${count} leads with email addresses`);
    console.log("\n📋 Next steps:");
    console.log("  1. Test auto-linking with: npm run dev");
    console.log("  2. Send/receive emails to test");
    console.log("  3. Check Leads folder in SEEDMAIL");

  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

// Run sync
main()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
