/**
 * Webhook Signature Verification Utilities
 * Verifies webhook payloads from Mailgun, Twilio, and Stripe
 *
 * Uses @noble/hashes for secure, audited cryptography
 */

import { verifyHMAC } from "@shared/crypto";
import { hmac } from "@noble/hashes/hmac";
import { sha1 } from "@noble/hashes/sha1";
import { utf8ToBytes } from "@noble/hashes/utils";

/**
 * Verify Mailgun webhook signature
 * @param timestamp - From webhook body
 * @param token - From webhook body
 * @param signature - From webhook body
 * @param signingKey - MAILGUN_SIGNING_KEY from env
 * @returns true if signature is valid
 */
export function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  signingKey: string
): boolean {
  if (!timestamp || !token || !signature || !signingKey) {
    return false;
  }

  // Mailgun uses HMAC-SHA256(timestamp + token)
  const data = timestamp + token;
  return verifyHMAC(signingKey, data, signature);
}

/**
 * Verify Twilio webhook signature
 * @param url - Full URL of the webhook (e.g., https://dev-api.seedfinancial.io/api/crm/webhooks/sms)
 * @param params - POST body parameters (already parsed by body-parser)
 * @param headerSignature - X-Twilio-Signature header value
 * @param authToken - TWILIO_AUTH_TOKEN from env
 * @returns true if signature is valid
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  headerSignature: string,
  authToken: string
): boolean {
  if (!url || !headerSignature || !authToken) {
    return false;
  }

  // Twilio signature = HMAC-SHA1(url + sorted params)
  // NOTE: SHA1 is used because Twilio requires it (not our choice)
  // Sort params alphabetically and append key=value pairs
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, key) => {
    return acc + key + params[key];
  }, url);

  // Compute HMAC-SHA1
  const keyBytes = utf8ToBytes(authToken);
  const dataBytes = utf8ToBytes(data);
  const signature = hmac(sha1, keyBytes, dataBytes);

  // Twilio uses base64 encoding
  const expected = Buffer.from(signature).toString("base64");

  // Constant-time comparison
  return constantTimeEqual(headerSignature, expected);
}

/**
 * Verify Stripe webhook signature
 * @param rawBody - Raw request body (before body-parser) as Buffer or string
 * @param sigHeader - stripe-signature header value
 * @param secret - STRIPE_WEBHOOK_SECRET from env
 * @returns true if signature is valid
 */
export function verifyStripeSignature(
  rawBody: Buffer | string,
  sigHeader: string,
  secret: string
): boolean {
  if (!rawBody || !sigHeader || !secret) {
    return false;
  }

  // Parse Stripe signature header: t=timestamp,v1=signature
  const parts = sigHeader.split(",");
  let timestamp: string | undefined;
  let signature: string | undefined;

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signature = value;
  });

  if (!timestamp || !signature) {
    return false;
  }

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);
  const tolerance = 300; // 5 minutes

  if (Math.abs(now - timestampNum) > tolerance) {
    console.warn("[WebhookVerify] Stripe timestamp outside tolerance");
    return false;
  }

  // Compute expected signature: HMAC-SHA256(timestamp + "." + rawBody)
  const payload = `${timestamp}.${rawBody.toString("utf-8")}`;
  return verifyHMAC(secret, payload, signature);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
