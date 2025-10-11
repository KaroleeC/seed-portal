/**
 * Email Events SSE Router
 * 
 * Server-Sent Events endpoint for real-time email sync notifications
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { sseEvents } from "../services/sse-events";
import { logger } from "../logger";
import { createClient } from "@supabase/supabase-js";
import { storage } from "../storage";

const router = Router();

// Initialize Supabase client for token verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Auth middleware for SSE that accepts token from query params
 * (EventSource doesn't support custom headers)
 */
async function requireAuthSSE(req: any, res: Response, next: NextFunction) {
  try {
    // Get token from query parameter (EventSource limitation)
    const token = req.query.token as string;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!supabase) {
      return res.status(500).json({ error: "Auth service unavailable" });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Load app user
    const appUser = await storage.getUserByAuthUserId(user.id);
    if (!appUser) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request
    req.user = appUser;
    req.principal = {
      userId: appUser.id,
      authUserId: user.id,
      email: appUser.email,
      role: appUser.role || "employee",
    };

    next();
  } catch (error) {
    logger.error({ error }, "SSE auth error");
    return res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * GET /api/email/events/:accountId
 * 
 * SSE endpoint for real-time email sync notifications
 * 
 * Events:
 * - sync-completed: Fired when background email sync completes
 * 
 * Client usage:
 * ```typescript
 * const eventSource = new EventSource('/api/email/events/account-123');
 * eventSource.addEventListener('sync-completed', (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Sync completed:', data);
 * });
 * ```
 */
router.get("/api/email/events/:accountId", requireAuthSSE, (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const userId = (req.user as any)?.id || "unknown";

  // Validate account ID
  if (!accountId) {
    return res.status(400).json({ error: "Account ID is required" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // CORS headers for SSE (if needed)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Send initial connection established event
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ accountId, timestamp: new Date().toISOString() })}\n\n`);

  // Register this client
  sseEvents.addClient(accountId, userId, res);

  logger.info({ accountId, userId }, "SSE connection established");

  // Handle client disconnect
  req.on("close", () => {
    logger.info({ accountId, userId }, "SSE connection closed by client");
  });
});

export default router;
