// Centralized debug logging utility to reduce console spam
import { logger } from "../logger";

export const debugConfig = {
  // Set to false to disable debug logging in production
  enabled: process.env.NODE_ENV === "development",
  // Specific debug categories
  redis: true,
  auth: true,
  routes: true,
  database: true,
  api: true,
};

export function debugLog(category: keyof typeof debugConfig, message: string, data?: any) {
  if (!debugConfig.enabled || !debugConfig[category]) {
    return;
  }

  const prefix = `[${category.toUpperCase()}]`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Convenience functions for common debug categories
export const redisDebug = (message: string, data?: any) => debugLog("redis", message, data);
export const authDebug = (message: string, data?: any) => debugLog("auth", message, data);
export const routesDebug = (message: string, data?: any) => debugLog("routes", message, data);
export const databaseDebug = (message: string, data?: any) => debugLog("database", message, data);
export const apiDebug = (message: string, data?: any) => debugLog("api", message, data);
