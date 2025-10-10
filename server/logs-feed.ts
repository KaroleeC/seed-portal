import { getRedisAsync } from "./redis.js";

// Lightweight in-app logs feed with Redis-backed storage and in-memory fallback
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
) {
  const entry: ModuleLog = {
    ts: new Date().toISOString(),
    level,
    message,
    context,
  };
  const redis = await getRedisAsync();
  const key = `logs:module:${moduleName}`;
  try {
    if (redis?.cacheRedis) {
      await redis.cacheRedis.lpush(key, JSON.stringify(entry));
      await redis.cacheRedis.ltrim(key, 0, MAX_LOGS - 1);
      return;
    }
  } catch (err) {
    // fall back to memory
  }
  const list = memBuffers.get(moduleName) ?? [];
  list.unshift(entry);
  if (list.length > MAX_LOGS) list.length = MAX_LOGS;
  memBuffers.set(moduleName, list);
}

export async function getModuleLogs(moduleName: string, limit = 100): Promise<ModuleLog[]> {
  const redis = await getRedisAsync();
  const key = `logs:module:${moduleName}`;
  try {
    if (redis?.cacheRedis) {
      const raw = await redis.cacheRedis.lrange(
        key,
        0,
        Math.max(0, Math.min(MAX_LOGS - 1, limit - 1))
      );
      return (raw || [])
        .map((s: string) => {
          try {
            return JSON.parse(s);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  } catch (err) {
    // fall through to memory
  }
  const list = memBuffers.get(moduleName) ?? [];
  return list.slice(0, limit);
}
