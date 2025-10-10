/**
 * Email Tracking Service
 * Handles tracking pixels for read receipts and delivery status
 */

import { nanoid } from "nanoid";

/**
 * Generate a unique tracking pixel ID
 */
export function generateTrackingPixelId(): string {
  return nanoid(32); // Long random ID for security
}

/**
 * Generate tracking pixel HTML
 * Returns a 1x1 transparent GIF image tag
 */
export function generateTrackingPixelHtml(trackingId: string, apiBaseUrl: string): string {
  const trackingUrl = `${apiBaseUrl}/api/email/track/${trackingId}/open.gif`;
  return `<img src="${trackingUrl}" width="1" height="1" style="display:none;border:0;outline:0;" alt="" />`;
}

/**
 * Inject tracking pixel into email HTML
 * Adds it just before the closing </body> tag, or at the end if no </body>
 */
export function injectTrackingPixel(html: string, trackingPixelHtml: string): string {
  // Try to insert before </body>
  if (html.includes("</body>")) {
    return html.replace("</body>", `${trackingPixelHtml}</body>`);
  }

  // Try to insert before </html>
  if (html.includes("</html>")) {
    return html.replace("</html>", `${trackingPixelHtml}</html>`);
  }

  // Otherwise just append at the end
  return html + trackingPixelHtml;
}

/**
 * Get approximate location from IP address
 * Uses a free IP geolocation service
 */
export async function getLocationFromIp(ip: string): Promise<string | null> {
  try {
    // Skip for localhost/private IPs
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return "Local Network";
    }

    // Use ipapi.co (free tier: 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.city && data.country_name) {
      return `${data.city}, ${data.country_name}`;
    } else if (data.country_name) {
      return data.country_name;
    }

    return null;
  } catch (error) {
    console.error("[Tracking] Failed to get location from IP:", error);
    return null;
  }
}

/**
 * Generate a 1x1 transparent GIF
 * Returns a Buffer with the GIF data
 */
export function generateTransparentGif(): Buffer {
  // 1x1 transparent GIF (43 bytes)
  const gifBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return Buffer.from(gifBase64, "base64");
}

/**
 * Calculate retry delay using exponential backoff
 * Returns timestamp for next retry
 */
export function calculateNextRetry(retryCount: number): Date {
  // Exponential backoff: 1min, 5min, 30min, 2hr
  const delays = [
    1 * 60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    30 * 60 * 1000, // 30 minutes
    2 * 60 * 60 * 1000, // 2 hours
  ];

  const delay = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delay);
}

/**
 * Determine bounce type from error message
 */
export function determineBounceType(errorMessage: string): {
  type: "hard" | "soft" | "complaint" | null;
  reason: string;
} {
  const lowerError = errorMessage.toLowerCase();

  // Hard bounces (permanent failures)
  if (
    lowerError.includes("user unknown") ||
    lowerError.includes("address rejected") ||
    lowerError.includes("domain not found") ||
    lowerError.includes("no such user") ||
    lowerError.includes("mailbox not found")
  ) {
    return { type: "hard", reason: "Recipient address does not exist" };
  }

  // Soft bounces (temporary failures)
  if (
    lowerError.includes("mailbox full") ||
    lowerError.includes("quota exceeded") ||
    lowerError.includes("temporarily unavailable") ||
    lowerError.includes("try again later")
  ) {
    return { type: "soft", reason: "Temporary delivery failure" };
  }

  // Spam complaints
  if (
    lowerError.includes("spam") ||
    lowerError.includes("blocked") ||
    lowerError.includes("blacklist")
  ) {
    return { type: "complaint", reason: "Message blocked as spam" };
  }

  return { type: null, reason: errorMessage };
}
