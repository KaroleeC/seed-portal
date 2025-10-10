/**
 * Shared Cryptographic Utilities
 *
 * Uses @noble/hashes for modern, secure, audited cryptography.
 *
 * Key principles:
 * - Password hashing: Use bcrypt/argon2 (NOT this module)
 * - Encryption: Use @noble/ciphers or Web Crypto API (NOT this module)
 * - JWT: Use jsonwebtoken or jose (NOT this module)
 * - Hashing & HMAC: Use this module
 */

import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { hmac } from "@noble/hashes/hmac";
import {
  randomBytes as nobleRandomBytes,
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils";

// Re-export for convenience
export { sha256, sha512, hmac, bytesToHex, hexToBytes, utf8ToBytes };

/**
 * Generate cryptographically secure random bytes
 * Uses @noble/hashes for consistency across environments
 */
export function randomBytes(length: number): Uint8Array {
  return nobleRandomBytes(length);
}

/**
 * Generate a random hex string
 * Useful for API keys, tokens, IDs
 */
export function randomHex(length: number = 32): string {
  return bytesToHex(randomBytes(length));
}

/**
 * Hash data with SHA-256
 * Returns hex string for easy storage/comparison
 */
export function hash256(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? utf8ToBytes(data) : data;
  return bytesToHex(sha256(bytes));
}

/**
 * Hash data with SHA-512
 * Returns hex string for easy storage/comparison
 */
export function hash512(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? utf8ToBytes(data) : data;
  return bytesToHex(sha512(bytes));
}

/**
 * Generate HMAC-SHA256 signature
 * Used for webhook verification, message authentication
 *
 * @param key - Secret key (string or bytes)
 * @param message - Message to sign (string or bytes)
 * @returns Hex-encoded signature
 */
export function hmacSHA256(key: string | Uint8Array, message: string | Uint8Array): string {
  const keyBytes = typeof key === "string" ? utf8ToBytes(key) : key;
  const messageBytes = typeof message === "string" ? utf8ToBytes(message) : message;
  return bytesToHex(hmac(sha256, keyBytes, messageBytes));
}

/**
 * Verify HMAC-SHA256 signature (constant-time comparison)
 *
 * @param key - Secret key
 * @param message - Original message
 * @param signature - Signature to verify (hex string)
 * @returns true if signature is valid
 */
export function verifyHMAC(
  key: string | Uint8Array,
  message: string | Uint8Array,
  signature: string
): boolean {
  const expected = hmacSHA256(key, message);

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Hash an object (for cache keys, data integrity checks)
 * Serializes object deterministically before hashing
 */
export function hashObject(obj: Record<string, any>): string {
  // Sort keys for deterministic serialization
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return hash256(sorted);
}

/**
 * Generate a content hash for ETags, cache validation
 */
export function generateETag(content: string | Buffer): string {
  const bytes = typeof content === "string" ? utf8ToBytes(content) : new Uint8Array(content);
  return `"${hash256(bytes)}"`;
}

/**
 * Generate a secure random token (for API keys, session tokens)
 * Returns base64url-encoded string (URL-safe)
 */
export function generateToken(bytes: number = 32): string {
  const random = randomBytes(bytes);
  // Convert to base64url (URL-safe)
  return bytesToHex(random);
}
