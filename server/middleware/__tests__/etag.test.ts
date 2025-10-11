import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  generateETag,
  hasMatchingETag,
  withETag,
  createETagFromMetadata,
  CACHEABLE_ENDPOINTS,
} from "../etag";

describe("ETag Middleware", () => {
  describe("generateETag()", () => {
    it("generates consistent ETags for same data", () => {
      const data = { foo: "bar", baz: 123 };
      const etag1 = generateETag(data);
      const etag2 = generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it("generates different ETags for different data", () => {
      const data1 = { foo: "bar" };
      const data2 = { foo: "baz" };

      const etag1 = generateETag(data1);
      const etag2 = generateETag(data2);

      expect(etag1).not.toBe(etag2);
    });

    it("handles string data", () => {
      const etag = generateETag("test string");

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("handles complex nested objects", () => {
      const data = {
        user: { id: 1, name: "Test" },
        items: [1, 2, 3],
        metadata: { created: "2024-01-01" },
      };

      const etag = generateETag(data);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("is sensitive to property order", () => {
      // JSON.stringify maintains property insertion order
      const data1 = { a: 1, b: 2 };
      const data2 = { b: 2, a: 1 };

      const etag1 = generateETag(data1);
      const etag2 = generateETag(data2);

      // These will be different due to key order
      expect(etag1).not.toBe(etag2);
    });
  });

  describe("hasMatchingETag()", () => {
    it("returns true when ETags match", () => {
      const req = {
        headers: { "if-none-match": '"abc123"' },
      } as Request;

      expect(hasMatchingETag(req, '"abc123"')).toBe(true);
    });

    it("returns false when ETags don't match", () => {
      const req = {
        headers: { "if-none-match": '"abc123"' },
      } as Request;

      expect(hasMatchingETag(req, '"def456"')).toBe(false);
    });

    it("returns false when no If-None-Match header", () => {
      const req = {
        headers: {},
      } as Request;

      expect(hasMatchingETag(req, '"abc123"')).toBe(false);
    });

    it("handles multiple ETags", () => {
      const req = {
        headers: { "if-none-match": '"abc123", "def456", "ghi789"' },
      } as Request;

      expect(hasMatchingETag(req, '"def456"')).toBe(true);
      expect(hasMatchingETag(req, '"xyz999"')).toBe(false);
    });

    it("handles wildcard ETag", () => {
      const req = {
        headers: { "if-none-match": "*" },
      } as Request;

      expect(hasMatchingETag(req, '"anything"')).toBe(true);
    });
  });

  describe("withETag() middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let jsonSpy: ReturnType<typeof vi.fn>;
    let endSpy: ReturnType<typeof vi.fn>;
    let setHeaderSpy: ReturnType<typeof vi.fn>;
    let statusSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      jsonSpy = vi.fn();
      endSpy = vi.fn();
      setHeaderSpy = vi.fn();
      statusSpy = vi.fn().mockReturnThis();

      req = {
        method: "GET",
        path: "/api/test",
        headers: {},
      };

      res = {
        json: jsonSpy,
        send: vi.fn(),
        setHeader: setHeaderSpy,
        status: statusSpy,
        end: endSpy,
        statusCode: 200,
      };

      next = vi.fn();
    });

    it("calls next() for GET requests", () => {
      const middleware = withETag();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it("skips ETag for non-GET requests", () => {
      req.method = "POST";
      const middleware = withETag();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Original json method should be unchanged
      expect(res.json).toBe(jsonSpy);
    });

    it("generates ETag and sets header on response", () => {
      const middleware = withETag();
      middleware(req as Request, res as Response, next);

      const data = { test: "data" };
      (res as any).json(data);

      expect(setHeaderSpy).toHaveBeenCalledWith("ETag", expect.stringMatching(/^"[a-f0-9]{32}"$/));
    });

    it("returns 304 when ETag matches", () => {
      const data = { test: "data" };
      const etag = generateETag(data);
      req.headers!["if-none-match"] = etag;

      const middleware = withETag();
      middleware(req as Request, res as Response, next);

      (res as any).json(data);

      expect(statusSpy).toHaveBeenCalledWith(304);
      expect(endSpy).toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it("returns 200 with data when ETag doesn't match", () => {
      req.headers!["if-none-match"] = '"different-etag"';

      const middleware = withETag();
      middleware(req as Request, res as Response, next);

      const data = { test: "data" };
      (res as any).json(data);

      expect(jsonSpy).toHaveBeenCalledWith(data);
      expect(statusSpy).not.toHaveBeenCalledWith(304);
    });

    it("sets Cache-Control header when maxAge provided", () => {
      const middleware = withETag({ maxAge: 3600 });
      middleware(req as Request, res as Response, next);

      const data = { test: "data" };
      (res as any).json(data);

      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "public, max-age=3600");
    });

    it("supports weak ETags", () => {
      const middleware = withETag({ weak: true });
      middleware(req as Request, res as Response, next);

      const data = { test: "data" };
      (res as any).json(data);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        "ETag",
        expect.stringMatching(/^W\/"[a-f0-9]{32}"$/)
      );
    });
  });

  describe("createETagFromMetadata()", () => {
    it("creates ETag from version", () => {
      const etag = createETagFromMetadata({ version: "1.0.0" });

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("creates ETag from timestamp", () => {
      const etag = createETagFromMetadata({
        updatedAt: new Date("2024-01-01"),
      });

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("creates ETag from count", () => {
      const etag = createETagFromMetadata({ count: 42 });

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("creates ETag from combined metadata", () => {
      const etag = createETagFromMetadata({
        version: "2.0.0",
        updatedAt: new Date("2024-01-01"),
        count: 100,
      });

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("generates consistent ETags for same metadata", () => {
      const metadata = {
        version: "1.0.0",
        updatedAt: new Date("2024-01-01"),
      };

      const etag1 = createETagFromMetadata(metadata);
      const etag2 = createETagFromMetadata(metadata);

      expect(etag1).toBe(etag2);
    });

    it("generates different ETags for different versions", () => {
      const etag1 = createETagFromMetadata({ version: "1.0.0" });
      const etag2 = createETagFromMetadata({ version: "1.0.1" });

      expect(etag1).not.toBe(etag2);
    });
  });

  describe("CACHEABLE_ENDPOINTS", () => {
    it("includes expected endpoints", () => {
      expect(CACHEABLE_ENDPOINTS).toContain("/api/pricing/config");
      expect(CACHEABLE_ENDPOINTS).toContain("/api/calculator/content");
      expect(CACHEABLE_ENDPOINTS).toContain("/api/deals");
      expect(CACHEABLE_ENDPOINTS).toContain("/api/email/threads");
    });

    it("is a readonly array in TypeScript", () => {
      // TypeScript enforces readonly at compile time
      // Runtime check: array should be defined and have correct type
      expect(Array.isArray(CACHEABLE_ENDPOINTS)).toBe(true);
      expect(CACHEABLE_ENDPOINTS.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("generates ETags quickly for large payloads", () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: Array.from({ length: 100 }, (_, j) => j),
        })),
      };

      const start = Date.now();
      const etag = generateETag(largeData);
      const duration = Date.now() - start;

      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});
