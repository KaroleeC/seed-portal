import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTrackingPixelId,
  generateTrackingPixelHtml,
  injectTrackingPixel,
  calculateNextRetry,
  determineBounceType,
  generateTransparentGif,
} from "../email-tracking";

describe("Email Tracking Service", () => {
  describe("generateTrackingPixelId", () => {
    it("should generate a 32-character tracking ID", () => {
      const id = generateTrackingPixelId();
      expect(id).toHaveLength(32);
    });

    it("should generate unique IDs", () => {
      const id1 = generateTrackingPixelId();
      const id2 = generateTrackingPixelId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateTrackingPixelHtml", () => {
    it("should generate correct HTML with tracking URL", () => {
      const trackingId = "test-tracking-id-123";
      const apiBaseUrl = "https://api.example.com";

      const html = generateTrackingPixelHtml(trackingId, apiBaseUrl);

      expect(html).toContain(`src="${apiBaseUrl}/api/email/track/${trackingId}/open.gif"`);
      expect(html).toContain('width="1"');
      expect(html).toContain('height="1"');
      expect(html).toContain('style="display:none');
    });
  });

  describe("injectTrackingPixel", () => {
    it("should inject before </body> tag", () => {
      const html = "<html><body><p>Content</p></body></html>";
      const pixel = '<img src="pixel.gif" />';

      const result = injectTrackingPixel(html, pixel);

      expect(result).toBe("<html><body><p>Content</p>" + pixel + "</body></html>");
    });

    it("should inject before </html> tag if no </body>", () => {
      const html = "<html><p>Content</p></html>";
      const pixel = '<img src="pixel.gif" />';

      const result = injectTrackingPixel(html, pixel);

      expect(result).toBe("<html><p>Content</p>" + pixel + "</html>");
    });

    it("should append at end if no closing tags", () => {
      const html = "<p>Content</p>";
      const pixel = '<img src="pixel.gif" />';

      const result = injectTrackingPixel(html, pixel);

      expect(result).toBe("<p>Content</p>" + pixel);
    });
  });

  describe("calculateNextRetry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    });

    it("should calculate 1 minute delay for first retry", () => {
      const nextRetry = calculateNextRetry(0);
      const expectedTime = new Date("2025-01-01T12:01:00Z");

      expect(nextRetry.getTime()).toBe(expectedTime.getTime());
    });

    it("should calculate 5 minute delay for second retry", () => {
      const nextRetry = calculateNextRetry(1);
      const expectedTime = new Date("2025-01-01T12:05:00Z");

      expect(nextRetry.getTime()).toBe(expectedTime.getTime());
    });

    it("should calculate 30 minute delay for third retry", () => {
      const nextRetry = calculateNextRetry(2);
      const expectedTime = new Date("2025-01-01T12:30:00Z");

      expect(nextRetry.getTime()).toBe(expectedTime.getTime());
    });

    it("should cap at 2 hour delay for retries beyond third", () => {
      const nextRetry = calculateNextRetry(5);
      const expectedTime = new Date("2025-01-01T14:00:00Z");

      expect(nextRetry.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe("determineBounceType", () => {
    it("should detect hard bounce for unknown user", () => {
      const result = determineBounceType("User unknown in Gmail");

      expect(result.type).toBe("hard");
      expect(result.reason).toBe("Recipient address does not exist");
    });

    it("should detect hard bounce for no such user", () => {
      const result = determineBounceType("No such user here");

      expect(result.type).toBe("hard");
      expect(result.reason).toBe("Recipient address does not exist");
    });

    it("should detect soft bounce for mailbox full", () => {
      const result = determineBounceType("Mailbox full, try again later");

      expect(result.type).toBe("soft");
      expect(result.reason).toBe("Temporary delivery failure");
    });

    it("should detect soft bounce for quota exceeded", () => {
      const result = determineBounceType("Quota exceeded");

      expect(result.type).toBe("soft");
      expect(result.reason).toBe("Temporary delivery failure");
    });

    it("should detect spam complaint", () => {
      const result = determineBounceType("Message blocked as spam");

      expect(result.type).toBe("complaint");
      expect(result.reason).toBe("Message blocked as spam");
    });

    it("should detect spam complaint for blacklist", () => {
      const result = determineBounceType("Sender IP on blacklist");

      expect(result.type).toBe("complaint");
      expect(result.reason).toBe("Message blocked as spam");
    });

    it("should return null type for unrecognized error", () => {
      const result = determineBounceType("Some random error");

      expect(result.type).toBe(null);
      expect(result.reason).toBe("Some random error");
    });
  });

  describe("generateTransparentGif", () => {
    it("should generate a valid buffer", () => {
      const gif = generateTransparentGif();

      expect(gif).toBeInstanceOf(Buffer);
      expect(gif.length).toBeGreaterThan(0);
    });

    it("should generate the same GIF each time", () => {
      const gif1 = generateTransparentGif();
      const gif2 = generateTransparentGif();

      expect(gif1.equals(gif2)).toBe(true);
    });
  });
});
