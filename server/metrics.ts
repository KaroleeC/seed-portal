// Simple metrics recorder with in-memory storage (Redis removed)
// Metrics are stored in memory only and reset on server restart

let memSuccess = 0;
let memFailure = 0;
let memDurations: number[] = [];
let memLastFailure: { at: string; reason?: string } | null = null;

export async function recordHubspotSync(
  success: boolean,
  durationMs: number,
  failureReason?: string
): Promise<void> {
  // In-memory storage only (Redis removed)
  if (success) memSuccess++;
  else memFailure++;
  memDurations.unshift(durationMs);
  if (memDurations.length > 1000) memDurations = memDurations.slice(0, 1000);
  if (!success && failureReason)
    memLastFailure = { at: new Date().toISOString(), reason: failureReason };
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
  // In-memory storage only (Redis removed)
  const { count, avgMs, p95Ms } = computeStats(memDurations);
  return {
    successCount: memSuccess,
    failureCount: memFailure,
    durations: { count, avgMs, p95Ms },
    lastFailure: memLastFailure,
    backend: "memory",
  };
}
