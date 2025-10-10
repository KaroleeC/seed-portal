import { getRedisAsync } from "./redis.js";

// Simple metrics recorder with Redis-backed storage and in-memory fallback
// Keys (Redis):
//  - metrics:hubspot:sync:success (counter)
//  - metrics:hubspot:sync:failure (counter)
//  - metrics:hubspot:sync:durations (list of ms)
//  - metrics:hubspot:sync:lastFailure (stringified JSON)

let memSuccess = 0;
let memFailure = 0;
let memDurations: number[] = [];
let memLastFailure: { at: string; reason?: string } | null = null;

export async function recordHubspotSync(
  success: boolean,
  durationMs: number,
  failureReason?: string
) {
  const redis = await getRedisAsync();
  if (!redis) {
    // In-memory fallback
    if (success) memSuccess++;
    else memFailure++;
    memDurations.unshift(durationMs);
    if (memDurations.length > 1000) memDurations = memDurations.slice(0, 1000);
    if (!success && failureReason)
      memLastFailure = { at: new Date().toISOString(), reason: failureReason };
    return;
  }

  const { cacheRedis } = redis;
  try {
    if (success) {
      await cacheRedis.incr("metrics:hubspot:sync:success");
    } else {
      await cacheRedis.incr("metrics:hubspot:sync:failure");
      if (failureReason) {
        await cacheRedis.set(
          "metrics:hubspot:sync:lastFailure",
          JSON.stringify({
            at: new Date().toISOString(),
            reason: failureReason,
          })
        );
      }
    }
    await cacheRedis.lpush("metrics:hubspot:sync:durations", durationMs.toString());
    await cacheRedis.ltrim("metrics:hubspot:sync:durations", 0, 999); // keep last 1000
  } catch (err) {
    // Fall back to memory if Redis operation fails
    if (success) memSuccess++;
    else memFailure++;
    memDurations.unshift(durationMs);
    if (memDurations.length > 1000) memDurations = memDurations.slice(0, 1000);
    if (!success && failureReason)
      memLastFailure = { at: new Date().toISOString(), reason: failureReason };
  }
}

function computeStats(durations: number[]) {
  if (!durations.length) return { count: 0, avgMs: 0, p95Ms: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const count = sorted.length;
  const avgMs = Math.round(sorted.reduce((a, b) => a + b, 0) / count);
  const p95Idx = Math.ceil(count * 0.95) - 1;
  const p95Ms = sorted[Math.max(0, Math.min(count - 1, p95Idx))];
  return { count, avgMs, p95Ms };
}

export async function getHubspotMetrics() {
  const redis = await getRedisAsync();
  if (!redis) {
    const { count, avgMs, p95Ms } = computeStats(memDurations);
    return {
      successCount: memSuccess,
      failureCount: memFailure,
      durations: { count, avgMs, p95Ms },
      lastFailure: memLastFailure,
      backend: "memory",
    };
  }

  const { cacheRedis } = redis;
  try {
    const [succ, fail, durs, lastFail] = await Promise.all([
      cacheRedis.get("metrics:hubspot:sync:success"),
      cacheRedis.get("metrics:hubspot:sync:failure"),
      cacheRedis.lrange("metrics:hubspot:sync:durations", 0, 999),
      cacheRedis.get("metrics:hubspot:sync:lastFailure"),
    ]);
    const durations = (durs || [])
      .map((s: string) => parseInt(s, 10))
      .filter((n: number) => Number.isFinite(n));
    const stats = computeStats(durations);
    return {
      successCount: parseInt(succ || "0", 10),
      failureCount: parseInt(fail || "0", 10),
      durations: stats,
      lastFailure: lastFail ? JSON.parse(lastFail) : null,
      backend: "redis",
    };
  } catch (err) {
    const { count, avgMs, p95Ms } = computeStats(memDurations);
    return {
      successCount: memSuccess,
      failureCount: memFailure,
      durations: { count, avgMs, p95Ms },
      lastFailure: memLastFailure,
      backend: "memory",
    };
  }
}
