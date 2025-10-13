/**
 * Client-side logger utility
 *
 * Provides structured logging for the client application with support for
 * different log levels and environment-aware behavior.
 */

/* eslint-disable no-console */
// Console usage is intentional in this logger utility

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private isDebugEnabled: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isDebugEnabled = import.meta.env.VITE_DEBUG_HTTP === "1";
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return context ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment && (level === "debug" || level === "info")) {
      return false;
    }

    // Debug logs require explicit opt-in
    if (level === "debug" && !this.isDebugEnabled) {
      return false;
    }

    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;

    if (context) {
      console.log(this.formatMessage("debug", message), context);
    } else {
      console.log(this.formatMessage("debug", message));
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;

    if (context) {
      console.info(this.formatMessage("info", message), context);
    } else {
      console.info(this.formatMessage("info", message));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return;

    if (context) {
      console.warn(this.formatMessage("warn", message), context);
    } else {
      console.warn(this.formatMessage("warn", message));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog("error")) return;

    const errorContext = {
      ...context,
      ...(error instanceof Error ? { error: error.message, stack: error.stack } : { error }),
    };

    console.error(this.formatMessage("error", message), errorContext);
  }
}

// Export singleton instance
export const logger = new Logger();
