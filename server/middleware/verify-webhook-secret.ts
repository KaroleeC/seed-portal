import type { Request, Response, NextFunction } from "express";

/**
 * Verify a shared secret for incoming webhooks.
 * - Header: X-Webhook-Secret
 * - Optional IP allowlist via ZAPIER_ALLOWED_IPS (comma-separated)
 */
export function verifyWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secretHeader = req.header("X-Webhook-Secret") || req.header("x-webhook-secret");
  const expected = process.env.ZAPIER_WEBHOOK_SECRET || "";
  if (!expected) {
    // In development, allow missing secret but warn. In prod, require it.
    const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
    if (isProd) {
      res.status(500).json({ message: "Webhook secret not configured" });
      return;
    }
  }

  if (expected && secretHeader !== expected) {
    res.status(401).json({ message: "Invalid webhook secret" });
    return;
  }

  // Optional IP allowlist
  const allowlist = (process.env.ZAPIER_ALLOWED_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    const ok = allowlist.some((allowed) => ip === allowed);
    if (!ok) {
      res.status(403).json({ message: "IP not allowed" });
      return;
    }
  }

  next();
}
