import pino from "pino";
import pinoHttp from "pino-http";
import { log as viteLog } from "./vite";

// Create different logger configurations based on environment
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: "message",
  errorKey: "error",
  base: {
    env: process.env.NODE_ENV,
    pid: process.pid,
  },
  // Redact sensitive information
  redact: {
    paths: [
      "password",
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.token",
      "*.apiKey",
      "*.secret",
      "hubspotAccessToken",
      "slackBotToken",
      "openaiApiKey",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
        "x-request-id": req.headers["x-request-id"],
      },
      remoteAddress: req.connection?.remoteAddress,
      remotePort: req.connection?.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders(),
    }),
    err: pino.stdSerializers.err,
  },
};

// Development configuration with pretty printing
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      messageFormat: "{levelLabel} - {message}",
      errorLikeObjectKeys: ["err", "error"],
    },
  },
};

// Production configuration
const productionConfig: pino.LoggerOptions = {
  ...baseConfig,
  // In production, output structured JSON logs
  formatters: {
    level(label, number) {
      return { level: number, levelName: label };
    },
  },
};

// Create the logger instance
export const logger = pino(isProduction ? productionConfig : developmentConfig);

// Create child loggers for different modules
export const dbLogger = logger.child({ module: "database" });
export const authLogger = logger.child({ module: "auth" });
export const apiLogger = logger.child({ module: "api" });
export const redisLogger = logger.child({ module: "redis" });
export const hubspotLogger = logger.child({ module: "hubspot" });

// Utility function to log and also output to Vite dev server
export function logInfo(message: string, data?: any) {
  logger.info(data, message);
  if (isDevelopment) {
    viteLog(message);
  }
}

export function logError(message: string, error?: any, data?: any) {
  logger.error({ ...data, err: error }, message);
  if (isDevelopment) {
    viteLog(`ERROR: ${message}`);
  }
}

export function logWarn(message: string, data?: any) {
  logger.warn(data, message);
  if (isDevelopment) {
    viteLog(`WARN: ${message}`);
  }
}

export function logDebug(message: string, data?: any) {
  logger.debug(data, message);
}

// Express middleware for request logging
export function requestLogger() {
  return pinoHttp({
    logger,
    autoLogging: {
      ignore(req: any): boolean {
        const url = req?.url || "";
        // Skip logging for health checks and static assets
        return !!(
          url === "/api/health" ||
          url.startsWith("/assets/") ||
          url.startsWith("/@vite/") ||
          url.endsWith(".js") ||
          url.endsWith(".css")
        );
      },
    },
    customLogLevel(req, res, err) {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return "warn";
      } else if (res.statusCode >= 500 || err) {
        return "error";
      }
      return "info";
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} completed with ${res.statusCode}`;
    },
    customErrorMessage(req, res, err: any) {
      const msg = err?.message || "Unknown error";
      return `Request failed with ${res.statusCode}: ${msg}`;
    },
  });
}
