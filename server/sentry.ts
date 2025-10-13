/* eslint-disable no-param-reassign */
// Sentry hooks intentionally mutate event/breadcrumb objects
import * as Sentry from "@sentry/node";
import type { Express } from "express";
import { logger } from "./logger";

export function initializeSentry(_app: Express): boolean {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.info("Sentry DSN not provided, error tracking disabled");
    return false;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || "development",
      integrations: [
        // HTTP calls tracing
        Sentry.httpIntegration(),
        // Express middleware
        Sentry.expressIntegration(),
      ],
      // Performance Monitoring
      registerEsmLoaderHooks: false,
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // Release tracking
      release: process.env.APP_VERSION || "unknown",
      // Before send hook to filter out sensitive data
      beforeSend(event, hint) {
        // Filter out non-critical errors
        if (event.exception) {
          const error = hint.originalException;

          // Skip database connection errors (handled gracefully)
          if (error && typeof error === "object" && "code" in error) {
            const code = (error as { code: string }).code;
            if (["ECONNRESET", "ENOTFOUND", "ETIMEDOUT"].includes(code)) {
              logger.debug({ code }, "Skipping Sentry report for connection error");
              return null;
            }
          }

          // Skip authentication failures (expected behavior)
          if (error instanceof Error && error.message?.includes("authentication failed")) {
            return null;
          }
        }

        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
            if (breadcrumb.data) {
              // Remove sensitive headers
              if (breadcrumb.data.headers) {
                delete breadcrumb.data.headers.authorization;
                delete breadcrumb.data.headers.cookie;
                delete breadcrumb.data.headers["x-csrf-token"];
              }
              // Remove sensitive body data
              if (breadcrumb.data.body) {
                if (breadcrumb.data.body.password) {
                  breadcrumb.data.body.password = "[REDACTED]";
                }
                if (breadcrumb.data.body.token) {
                  breadcrumb.data.body.token = "[REDACTED]";
                }
              }
            }
            return breadcrumb;
          });
        }

        return event;
      },
      // User context
      beforeSendTransaction(event) {
        // Add custom tags for better filtering
        if (event.tags) {
          event.tags.service = "seed-financial-portal";
        }
        return event;
      },
    });

    logger.info("Sentry error tracking initialized");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Sentry");
    return false;
  }
}

// Middleware to attach user context to Sentry
export function sentryUserContext() {
  return (
    req: { user?: { id: number; email: string }; ip?: string },
    _res: unknown,
    next: () => void
  ): void => {
    if (req.user) {
      Sentry.setUser({
        id: req.user.id.toString(),
        email: req.user.email,
        username: req.user.email,
        ip_address: req.ip,
      });
    }
    next();
  };
}

// Helper to capture custom events
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  extra?: Record<string, unknown>
): void {
  logger.info({ extra }, `Sentry: ${message}`);
  Sentry.captureMessage(message, {
    level,
    extra,
  });
}

// Helper to capture exceptions with context
export function captureException(error: Error, context?: Record<string, unknown>): void {
  logger.error({ err: error, context }, "Captured exception");
  Sentry.captureException(error, {
    extra: context,
  });
}
