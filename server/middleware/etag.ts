/**
 * ETag Middleware for Conditional HTTP Requests
 *
 * Implements ETag generation and 304 Not Modified responses for cacheable endpoints.
 * Performance benefit: Reduces bandwidth and improves response time when content hasn't changed.
 *
 * Usage:
 *   app.get('/api/resource', withETag(), (req, res) => { ... });
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { createHash } from "crypto";
import { logger } from "../logger";

const etagLogger = logger.child({ module: "etag" });

/**
 * Cacheable endpoints configuration.
 * Add endpoints here that benefit from ETag caching.
 */
export const CACHEABLE_ENDPOINTS = [
  "/api/pricing/config",
  "/api/calculator/content",
  "/api/deals",
  "/api/email/threads",
  "/api/roles",
  "/api/permissions",
  "/api/kb/categories",
] as const;

export type CacheableEndpoint = (typeof CACHEABLE_ENDPOINTS)[number];

/**
 * Generate an ETag from response data.
 * Uses SHA-256 hash for strong validation.
 *
 * @param data - Response data (will be JSON.stringify'd)
 * @returns ETag string in format: "hash"
 */
export function generateETag(data: unknown): string {
  const content = typeof data === "string" ? data : JSON.stringify(data);
  const hash = createHash("sha256").update(content, "utf8").digest("hex");

  // Use first 32 chars of hash for ETag (sufficient for collision resistance)
  return `"${hash.substring(0, 32)}"`;
}

/**
 * Check if request has matching ETag.
 *
 * @param req - Express request
 * @param etag - Current ETag
 * @returns true if ETags match (content unchanged)
 */
export function hasMatchingETag(req: Request, etag: string): boolean {
  const ifNoneMatch = req.headers["if-none-match"];

  if (!ifNoneMatch) {
    return false;
  }

  // Handle multiple ETags (comma-separated)
  const clientETags = ifNoneMatch.split(",").map((tag) => tag.trim());

  return clientETags.includes(etag) || clientETags.includes("*");
}

/**
 * Middleware to add ETag support to route handlers.
 *
 * This middleware intercepts res.json() and res.send() to:
 * 1. Generate an ETag from the response data
 * 2. Check if client has matching ETag (If-None-Match)
 * 3. Return 304 Not Modified if match
 * 4. Return 200 with ETag header if no match
 *
 * @param options - Configuration options
 * @returns Express middleware
 */
export interface ETagOptions {
  /**
   * Whether to enable weak ETags (W/ prefix).
   * Weak ETags indicate semantic equivalence.
   * Strong ETags (default) indicate byte-for-byte equivalence.
   */
  weak?: boolean;

  /**
   * Cache-Control max-age in seconds (optional).
   * If provided, adds Cache-Control header.
   */
  maxAge?: number;
}

export function withETag(options: ETagOptions = {}): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to GET and HEAD requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override res.json
    res.json = function (data: any) {
      // Generate ETag
      const etag = options.weak ? `W/${generateETag(data)}` : generateETag(data);

      // Set ETag header
      res.setHeader("ETag", etag);

      // Set Cache-Control if maxAge specified
      if (options.maxAge !== undefined) {
        res.setHeader("Cache-Control", `public, max-age=${options.maxAge}`);
      }

      // Check if client has matching ETag
      if (hasMatchingETag(req, etag)) {
        etagLogger.debug("ETag match - returning 304", {
          path: req.path,
          etag,
        });

        // Return 304 Not Modified (no body)
        res.status(304).end();
        return res;
      }

      // ETags don't match - return full response
      return originalJson(data);
    };

    // Override res.send for non-JSON responses
    res.send = function (data: any) {
      // Only apply ETag to successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const etag = options.weak ? `W/${generateETag(data)}` : generateETag(data);

        res.setHeader("ETag", etag);

        if (options.maxAge !== undefined) {
          res.setHeader("Cache-Control", `public, max-age=${options.maxAge}`);
        }

        if (hasMatchingETag(req, etag)) {
          etagLogger.debug("ETag match - returning 304", {
            path: req.path,
            etag,
          });

          res.status(304).end();
          return res;
        }
      }

      return originalSend(data);
    };

    next();
  };
}

/**
 * Utility to create ETag from version/timestamp metadata.
 * Useful when you have version info without needing to hash full payload.
 *
 * @param metadata - Version, timestamp, or other identifying info
 * @returns ETag string
 */
export function createETagFromMetadata(metadata: {
  version?: string | number;
  updatedAt?: Date | string;
  count?: number;
}): string {
  const parts: string[] = [];

  if (metadata.version) {
    parts.push(`v${metadata.version}`);
  }

  if (metadata.updatedAt) {
    const timestamp =
      metadata.updatedAt instanceof Date
        ? metadata.updatedAt.getTime()
        : new Date(metadata.updatedAt).getTime();
    parts.push(`t${timestamp}`);
  }

  if (metadata.count !== undefined) {
    parts.push(`c${metadata.count}`);
  }

  const combined = parts.join("-");
  const hash = createHash("sha256").update(combined, "utf8").digest("hex");

  return `"${hash.substring(0, 32)}"`;
}

/**
 * Express middleware to set Cache-Control and Vary headers for cacheable routes.
 * Use this for routes that should be cached but don't need ETag validation.
 *
 * @param maxAge - Cache duration in seconds
 * @returns Express middleware
 */
export function setCacheHeaders(maxAge: number): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
    res.setHeader("Vary", "Accept-Encoding");
    next();
  };
}
