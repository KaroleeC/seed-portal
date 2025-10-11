// DISABLED: Redis removed - logs now use in-memory fallback only
// import { getRedisAsync } from "./redis.js";

// Lightweight in-app logs feed with in-memory storage (Redis removed)
// Keys:
//  - logs:module:<module> (list of JSON entries)

type LogLevel = "debug" | "info" | "warn" | "error";

export interface ModuleLog {
  ts: string; // ISO timestamp
  level: LogLevel;
  message: string;
  context?: any;
}

const memBuffers = new Map<string, ModuleLog[]>();
const MAX_LOGS = 1000;

export async function appendModuleLog(
  moduleName: string,
  level: LogLevel,
  message: string,
  context?: any
): Promise<void> {
  const entry: ModuleLog = {
    ts: new Date().toISOString(),
    level,
    message,
    context,
  };

  // Use in-memory storage only (Redis removed)
  const list = memBuffers.get(moduleName) ?? [];
  list.unshift(entry);
  if (list.length > MAX_LOGS) list.length = MAX_LOGS;
  memBuffers.set(moduleName, list);
}

export async function getModuleLogs(moduleName: string, limit = 100): Promise<ModuleLog[]> {
  // Use in-memory storage only (Redis removed)
  const list = memBuffers.get(moduleName) ?? [];
  return list.slice(0, limit);
}
