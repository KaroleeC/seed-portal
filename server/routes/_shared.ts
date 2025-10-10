/**
 * Shared Router Utilities
 *
 * Common middleware, validation helpers, and error handlers
 * used across all domain routers.
 */
/* eslint-disable no-param-reassign */
// Middleware intentionally mutates req/res objects
import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Require authentication middleware
 * Ensures user is logged in before accessing protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

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
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.errors,
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory for validating query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid query parameters",
        errors: result.error.errors,
      });
    }
    req.query = result.data as any;
    next();
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}

/**
 * Standard error response handler
 * Logs error and sends appropriate HTTP response
 */
export function handleError(error: unknown, res: Response, context?: string): void {
  const message = getErrorMessage(error);
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
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
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
 * For production, use Redis-backed rate limiter
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + options.windowMs };
      rateLimitStore.set(key, record);
    }

    record.count++;

    if (record.count > options.max) {
      return res.status(429).json({
        message: options.message || "Too many requests, please try again later",
      });
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
export function validateCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const token = req.headers["x-csrf-token"] || req.body?._csrf;
  const sessionToken = (req.session as any)?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
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
