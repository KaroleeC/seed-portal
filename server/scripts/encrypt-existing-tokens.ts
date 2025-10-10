/**
 * Migration Script: Encrypt Existing OAuth Tokens
 *
 * Run with: doppler run --project seed-portal-api --config dev -- tsx server/scripts/encrypt-existing-tokens.ts
 *
 * This script encrypts any unencrypted tokens in the email_accounts table.
 * It's safe to run multiple times - already encrypted tokens are skipped.
 */

import { db } from "../db";
import { emailAccounts } from "@shared/schema";
import { encryptToken, isEncryptionConfigured } from "@shared/encryption";
import { areTokensEncrypted } from "../services/email-tokens";
import { eq } from "drizzle-orm";

async function encryptExistingTokens() {
  console.log("🔐 Starting token encryption migration...\n");

  // Check encryption is configured
  if (!isEncryptionConfigured()) {
    console.error("❌ ERROR: ENCRYPTION_KEY not configured!");
    console.error(
      "   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    console.error(
      "   Then add to Doppler: doppler secrets set ENCRYPTION_KEY=<key> --project seed-portal-api --config dev"
    );
    process.exit(1);
  }

  console.log("✅ ENCRYPTION_KEY configured\n");

  // Get all email accounts (gracefully handle missing table)
  let accounts: Array<typeof emailAccounts.$inferSelect> = [] as any;
  try {
    accounts = await db.select().from(emailAccounts);
  } catch (e: any) {
    if (
      e?.code === "42P01" ||
      /relation \"?email_accounts\"? does not exist/i.test(String(e?.message))
    ) {
      console.warn("ℹ️  email_accounts table not found in this environment. Skipping migration.");
      console.log("\n✅ Script completed successfully (nothing to do)");
      return;
    }
    throw e;
  }
  console.log(`📧 Found ${accounts.length} email account(s)\n`);

  if (accounts.length === 0) {
    console.log("✅ No accounts to migrate");
    return;
  }

  let encryptedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const account of accounts) {
    try {
      // Check if already encrypted
      const alreadyEncrypted = account.accessToken
        ? areTokensEncrypted(account.accessToken)
        : false;

      if (alreadyEncrypted) {
        console.log(`⏭️  Account ${account.id} (${account.email}) - Already encrypted, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`🔒 Encrypting tokens for ${account.email}...`);

      // Encrypt tokens
      const updates: any = {};

      if (account.accessToken) {
        updates.accessToken = encryptToken(account.accessToken);
      }

      if (account.refreshToken) {
        updates.refreshToken = encryptToken(account.refreshToken);
      }

      if (Object.keys(updates).length > 0) {
        await db.update(emailAccounts).set(updates).where(eq(emailAccounts.id, account.id));

        console.log(`   ✅ Encrypted ${account.email}`);
        encryptedCount++;
      } else {
        console.log(`   ⚠️  No tokens to encrypt for ${account.email}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error encrypting ${account.email}:`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Summary:");
  console.log("=".repeat(50));
  console.log(`✅ Encrypted: ${encryptedCount}`);
  console.log(`⏭️  Skipped (already encrypted): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log("=".repeat(50));

  if (errorCount > 0) {
    console.log("\n⚠️  Some accounts failed to encrypt. Please review errors above.");
    process.exit(1);
  }

  console.log("\n🎉 Migration complete! All tokens are now encrypted.\n");
}

// Run migration
encryptExistingTokens()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
