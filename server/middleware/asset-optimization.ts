/* eslint-disable no-param-reassign */
// Middleware intentionally mutates req/res objects
import type { Request, Response, NextFunction } from "express";
import compression from "compression";
import { promises as fs } from "fs";
import path from "path";
import { BUILD_OUTPUT_PATH } from "../constants";

interface CompressionStats {
  requests: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  compressionRatio: number;
}

class AssetOptimizationService {
  private stats: CompressionStats = {
    requests: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    compressionRatio: 0,
  };

  getCompressionMiddleware() {
    return compression({
      // Compress responses larger than 1KB
      threshold: 1024,

      // Custom filter for what to compress
      filter: (req: Request, res: Response) => {
        // Don't compress if explicitly disabled
        if (req.headers["x-no-compression"]) {
          return false;
        }

        // Don't compress images, videos, or already compressed files
        const contentType = res.getHeader("content-type") as string;
        if (contentType) {
          const skipTypes = [
            "image/",
            "video/",
            "audio/",
            "application/zip",
            "application/gzip",
            "application/octet-stream",
          ];

          if (skipTypes.some((type) => contentType.includes(type))) {
            return false;
          }
        }

        // Use default compression filter for other content
        return compression.filter(req, res);
      },

      // Use gzip by default, brotli if supported
      level: 6, // Good balance of compression ratio and speed
    });
  }

  trackCompressionStats() {
    const self = this;

    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;

      const trackStats = (body: any) => {
        if (body && typeof body === "string") {
          const originalSize = Buffer.byteLength(body, "utf8");
          const encoding = res.getHeader("content-encoding");

          if (encoding === "gzip" || encoding === "br") {
            // Estimate compression ratio (simplified)
            const estimatedCompressed = Math.round(originalSize * 0.7); // Rough estimate

            self.stats.requests++;
            self.stats.totalOriginalSize += originalSize;
            self.stats.totalCompressedSize += estimatedCompressed;
            self.stats.compressionRatio =
              self.stats.totalOriginalSize > 0
                ? self.stats.totalCompressedSize / self.stats.totalOriginalSize
                : 1;
          }
        }
      };

      res.send = function (body: any) {
        trackStats(body);
        return originalSend.call(this, body);
      };

      res.json = function (obj: any) {
        const body = JSON.stringify(obj);
        trackStats(body);
        return originalJson.call(this, obj);
      };

      next();
    };
  }

  getStats(): CompressionStats {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = {
      requests: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      compressionRatio: 0,
    };
  }
}

// Middleware for setting optimal cache headers
export function setCacheHeaders(req: Request, res: Response, next: NextFunction) {
  const url = req.url;

  // Static assets with hash in filename - cache aggressively
  if (url.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  // Regular static assets - cache for 1 day
  else if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
  // HTML files - cache for 1 hour
  else if (url.match(/\.html?$/)) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
  // API responses - no cache by default (handled per endpoint)
  else if (url.startsWith("/api/")) {
    // Let individual endpoints set their own cache headers
  }
  // Default - cache for 5 minutes
  else {
    res.setHeader("Cache-Control", "public, max-age=300");
  }

  next();
}

// Middleware for serving pre-compressed assets
export function servePrecompressed(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  const url = req.url;

  // Only try for static assets
  if (!url.match(/\.(js|css|html)$/)) {
    return next();
  }

  const originalUrl = req.url;

  // Try brotli first if supported
  if (acceptEncoding.includes("br")) {
    const brPath = path.join(BUILD_OUTPUT_PATH, `${originalUrl}.br`);

    fs.access(brPath)
      .then(() => {
        res.setHeader("Content-Encoding", "br");
        res.setHeader("Content-Type", getContentType(originalUrl));
        req.url = `${originalUrl}.br`;
        next();
      })
      .catch(() => {
        // Try gzip
        tryGzip();
      });
  } else if (acceptEncoding.includes("gzip")) {
    tryGzip();
  } else {
    next();
  }

  function tryGzip() {
    const gzPath = path.join(BUILD_OUTPUT_PATH, `${originalUrl}.gz`);

    fs.access(gzPath)
      .then(() => {
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader("Content-Type", getContentType(originalUrl));
        req.url = `${originalUrl}.gz`;
        next();
      })
      .catch(() => {
        next();
      });
  }
}

function getContentType(url: string): string {
  if (url.endsWith(".js")) return "application/javascript";
  if (url.endsWith(".css")) return "text/css";
  if (url.endsWith(".html")) return "text/html";
  return "application/octet-stream";
}

export const assetOptimization = new AssetOptimizationService();
