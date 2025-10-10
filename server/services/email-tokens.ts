/**
 * Email Token Management
 *
 * Handles encryption/decryption of OAuth tokens for email accounts
 */

import { decryptToken } from "@shared/encryption";
import type { EmailAccount } from "@shared/schema";

/**
 * Decrypt tokens from database before use
 *
 * Email accounts store encrypted tokens. This helper decrypts them safely.
 */
export function decryptEmailTokens(account: Pick<EmailAccount, "accessToken" | "refreshToken">) {
  return {
    accessToken: account.accessToken ? decryptToken(account.accessToken) : "",
    refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : "",
  };
}

/**
 * Check if tokens are encrypted (for migration)
 * Encrypted tokens have format: nonce:ciphertext (both hex)
 */
export function areTokensEncrypted(token: string | null): boolean {
  if (!token) return false;

  const hexRegex = /^[0-9a-f]+$/i;
  const parts = token.split(":");

  // Legacy pattern: nonce(24 bytes -> 48 hex):ciphertext
  if (parts.length === 2) {
    const [nonce, ciphertext] = parts;
    return hexRegex.test(nonce) && hexRegex.test(ciphertext) && nonce.length === 48;
  }

  // New pattern (AES-GCM): iv(12 bytes -> 24 hex):ciphertext:tag(16 bytes -> 32 hex)
  if (parts.length === 3) {
    const [iv, ciphertext, tag] = parts;
    const ivOk = hexRegex.test(iv) && iv.length === 24;
    const tagOk = hexRegex.test(tag) && tag.length === 32;
    const ctOk = hexRegex.test(ciphertext); // variable length
    return ivOk && tagOk && ctOk;
  }

  return false;
}
