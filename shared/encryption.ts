/**
 * Encryption Utilities for Sensitive Data
 *
 * Uses Node's AES-256-GCM (createCipheriv/createDecipheriv) with random 12-byte IV
 *
 * CRITICAL: For encrypting sensitive tokens (OAuth, API keys)
 * NOT for passwords (use bcrypt) or general hashing
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Get encryption key from environment
 * MUST be 32 bytes (64 hex characters)
 * Generate with: openssl rand -hex 32
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array | Buffer): string {
  return Buffer.from(bytes).toString("hex");
}

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }

  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(hexToBytes(key));
}

/**
 * Encrypt sensitive data (OAuth tokens, API keys, etc.)
 *
 * Returns format: nonce:ciphertext (both hex-encoded)
 *
 * @param plaintext - Data to encrypt
 * @returns Encrypted data as "nonce:ciphertext"
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty value");
  }

  const key = getEncryptionKey(); // 32 bytes
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv:ciphertext:tag (hex)
  return `${bytesToHex(iv)}:${bytesToHex(ciphertext)}:${bytesToHex(tag)}`;
}

/**
 * Decrypt sensitive data
 *
 * @param encrypted - Encrypted data in "nonce:ciphertext" format
 * @returns Decrypted plaintext
 */
export function decryptToken(encrypted: string): string {
  if (!encrypted) {
    throw new Error("Cannot decrypt empty value");
  }
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected "iv:ciphertext:tag"');
  }

  const [ivHex, ctHex, tagHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(hexToBytes(ivHex));
  const ct = Buffer.from(hexToBytes(ctHex));
  const tag = Buffer.from(hexToBytes(tagHex));

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    const plaintextBuf = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plaintextBuf.toString("utf8");
  } catch {
    throw new Error("Decryption failed - data may be corrupted or key is incorrect");
  }
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64);
}

/**
 * Generate a new encryption key (for initial setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return bytesToHex(randomBytes(32));
}
