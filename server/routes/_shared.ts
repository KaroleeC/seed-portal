/**
 * Shared Router Utilities
 *
 * Common middleware, validation helpers, and error handlers
 * used across all domain routers.
 *
 * AUTHORIZATION PATTERN (Enforced by ESLint):
 * ✅ All routes MUST use requirePermission() middleware
 * ❌ Never use inline auth checks (req.user?.role === 'admin')
 *
 * Example:
 *   router.post(
 *     "/api/resource",
 *     requireAuth,
 *     requirePermission("resource.action", "resource"),
 *     handler
 *   );
 *
 * See: docs/AUTHORIZATION_PATTERN.md
 */
/* eslint-disable no-param-reassign */
// Middleware intentionally mutates req/res objects
import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";
import { getErrorMessage as getErrorMessageUtil } from "../utils/error-handling";

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Require authentication middleware
 * Ensures user is logged in before accessing protected routes
 *
 * Usage: Apply to all non-public routes
 */
export function requireAuth(
  req: Request & { isAuthenticated?: () => boolean },
  res: Response,
  next: NextFunction
): void {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    void res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

/**
 * Re-export authorization middleware from authz service
 * This provides a single import point for all auth needs
 *
 * Usage:
 *   import { requireAuth, requirePermission } from './_shared';
 *
 *   router.post('/api/resource',
 *     requireAuth,
 *     requirePermission('resource.action', 'resource'),
 *     handler
 *   );
 *
 * Note: requirePermission falls back to RBAC when USE_CERBOS=false
 * Define Cerbos policies later when services stabilize
 */
export { requirePermission } from "../services/authz/authorize.js";

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns validated data or sends 400 error response
 */
export function validateRequest<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    return null;
  }
  return result.data;
}

/**
 * Middleware factory for validating request bodies
 */
export function validateBody<T extends z.ZodType>(
  schema: T
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      void res.status(400).json({
        message: "Validation failed",
        errors: result.error.errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory for validating query parameters
 */
export function validateQuery<T extends z.ZodType>(
  schema: T
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      void res.status(400).json({
        message: "Invalid query parameters",
        errors: result.error.errors,
      });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.query = result.data as any;
    next();
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Extract error message from various error types
 * Re-exported from utils/error-handling for convenience
 */
export const getErrorMessage = getErrorMessageUtil;

/**
 * Standard error response handler
 * Logs error and sends appropriate HTTP response
 */
export function handleError(error: unknown, res: Response, context?: string): void {
  const message = getErrorMessageUtil(error);
  console.error(`[Error${context ? ` - ${context}` : ""}]:`, error);

  // Determine status code based on error type
  let statusCode = 500;
  if (message.includes("not found") || message.includes("Not found")) {
    statusCode = 404;
  } else if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("Invalid")
  ) {
    statusCode = 400;
  } else if (message.includes("unauthorized") || message.includes("Unauthorized")) {
    statusCode = 401;
  } else if (message.includes("forbidden") || message.includes("Forbidden")) {
    statusCode = 403;
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: error instanceof Error ? error.stack : undefined,
    }),
  });
}

/**
 * Async route handler wrapper
 * Catches errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(error, res);
    });
  };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Simple in-memory rate limiter
 * Suitable for single-server deployments
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + options.windowMs };
      rateLimitStore.set(key, record);
    }

    record.count++;

    if (record.count > options.max) {
      void res.status(429).json({
        message: options.message || "Too many requests, please try again later",
      });
      return;
    }

    next();
  };
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * CSRF token validation middleware
 * Validates CSRF token from header or body
 */
export function validateCsrf(
  req: Request & { session?: { csrfToken?: string } },
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const token = req.headers["x-csrf-token"] || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    void res.status(403).json({ message: "Invalid CSRF token" });
    return;
  }

  next();
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Send success response with data
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(data);
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  pageSize: number,
  total: number
): void {
  res.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
