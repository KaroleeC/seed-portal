import express from "express";
import path from "path";
import crypto from "crypto";
import { promises as fs } from "fs";
import { ASSETS_PATH } from "./constants";

interface AssetManifest {
  [key: string]: {
    hash: string;
    url: string;
    size: number;
    contentType: string;
    lastModified: string;
  };
}

class CDNService {
  private manifest: AssetManifest = {};
  private assetsPath: string;
  private baseUrl: string;
  private version: string;

  constructor() {
    this.assetsPath = ASSETS_PATH;
    this.baseUrl = process.env.CDN_BASE_URL || "";
    this.version = process.env.DEPLOYMENT_VERSION || Date.now().toString();
  }

  async initialize() {
    console.log("[CDN] Initializing CDN service...");
    await this.buildAssetManifest();
    console.log(`[CDN] Asset manifest built with ${Object.keys(this.manifest).length} assets`);
  }

  private async buildAssetManifest() {
    try {
      const assetsExist = await fs
        .access(this.assetsPath)
        .then(() => true)
        .catch(() => false);
      if (!assetsExist) {
        console.log("[CDN] Assets directory not found, skipping manifest build");
        return;
      }

      const files = await this.getAllFiles(this.assetsPath);

      for (const filePath of files) {
        const relativePath = path.relative(this.assetsPath, filePath);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath);

        // Generate content hash for versioning
        const hash = crypto.createHash("sha256").update(content).digest("hex").substring(0, 12);

        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = this.getContentType(ext);

        // Build versioned URL
        const fileName = path.basename(filePath, ext);
        const versionedName = `${fileName}-${hash}${ext}`;
        const assetUrl = this.baseUrl
          ? `${this.baseUrl}/assets/${versionedName}`
          : `/assets/${versionedName}`;

        this.manifest[relativePath] = {
          hash,
          url: assetUrl,
          size: stats.size,
          contentType,
          lastModified: stats.mtime.toISOString(),
        };
      }
    } catch (error) {
      console.error("[CDN] Error building asset manifest:", error);
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or is inaccessible
    }

    return files;
  }

  private getContentType(ext: string): string {
    const types: { [key: string]: string } = {
      ".js": "application/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
    };

    return types[ext] || "application/octet-stream";
  }

  getAssetUrl(assetPath: string): string {
    const asset = this.manifest[assetPath];
    return asset ? asset.url : `/assets/${assetPath}`;
  }

  getManifest(): AssetManifest {
    return this.manifest;
  }

  setupCDNMiddleware(app: express.Express) {
    console.log("[CDN] Setting up CDN middleware...");

    // Serve static assets with aggressive caching
    app.use(
      "/assets",
      express.static(this.assetsPath, {
        maxAge: "1y", // Cache for 1 year
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          // Set cache headers based on file type
          const ext = path.extname(filePath).toLowerCase();

          if (
            [
              ".js",
              ".css",
              ".png",
              ".jpg",
              ".jpeg",
              ".gif",
              ".svg",
              ".ico",
              ".woff",
              ".woff2",
            ].includes(ext)
          ) {
            // Static assets - cache aggressively
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            // HTML and other files - cache for shorter periods
            res.setHeader("Cache-Control", "public, max-age=3600");
          }

          // Add security headers
          res.setHeader("X-Content-Type-Options", "nosniff");

          // Add CORS headers for assets
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        },
      })
    );

    // Asset manifest endpoint
    app.get("/api/assets/manifest", (req, res) => {
      res.json({
        version: this.version,
        baseUrl: this.baseUrl,
        assets: this.manifest,
      });
    });

    // Health check for CDN
    app.get("/api/cdn/health", (req, res) => {
      res.json({
        status: "healthy",
        assetsLoaded: Object.keys(this.manifest).length,
        version: this.version,
        baseUrl: this.baseUrl || "local",
      });
    });

    console.log("[CDN] CDN middleware configured successfully");
  }
}

// Asset URL helper for templates
export function assetUrl(path: string): string {
  return cdnService.getAssetUrl(path);
}

export const cdnService = new CDNService();
