import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  ListFilter,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { seedpayKeys } from "@/lib/queryKeys";

interface SmokeResult {
  success: boolean;
  checks: Array<{
    key: string;
    label: string;
    ok: boolean;
    error?: string;
    note?: string;
  }>;
  failures: string[];
  detail?: any;
  disclaimer: string;
}

export default function AdminHubspotPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<
    "diagnostics" | "metrics" | "logs" | "actions"
  >("diagnostics");

  // Diagnostics state
  const [includeConnectivity, setIncludeConnectivity] = useState(true);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<SmokeResult | null>(null);

  // Metrics
  const metricsQuery = useQuery({
    queryKey: ["/api/admin/metrics/hubspot"],
    queryFn: async () => await apiRequest("GET", "/api/admin/metrics/hubspot"),
    enabled: tab === "metrics",
    refetchInterval: 30000,
  });

  // Logs
  const logsQuery = useQuery<{ module: string; logs: any[] }>({
    queryKey: ["/api/admin/logs", "hubspot"],
    queryFn: async () =>
      await apiRequest("GET", "/api/admin/logs?module=hubspot&limit=200"),
    enabled: tab === "logs",
    refetchInterval: 20000,
  });

  // Actions: Sync form
  const [quoteId, setQuoteId] = useState("");
  const [action, setAction] = useState<"auto" | "create" | "update">("auto");
  const [dryRun, setDryRun] = useState(true);
  const [includeConnInSync, setIncludeConnInSync] = useState(true);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [clearCacheLoading, setClearCacheLoading] = useState(false);

  async function runSmokeTest() {
    setDiagLoading(true);
    try {
      const res = await apiRequest<SmokeResult>(
        "POST",
        "/api/admin/diagnostics/hubspot/smoke",
        { includeConnectivity },
      );
      setDiagResult(res);
    } catch (e: any) {
      setDiagResult({
        success: false,
        checks: [],
        failures: ["Request failed"],
        disclaimer: "See error",
        detail: { error: e?.message },
      } as any);
    } finally {
      setDiagLoading(false);
    }
  }

  async function handleClearSeedPayCache() {
    setClearCacheLoading(true);
    try {
      // CSRF token
      const csrfResponse = await fetch("/api/csrf-token");
      const { csrfToken } = await csrfResponse.json();
      // Clear cache via app-namespaced admin alias
      const resp = await fetch("/api/admin/apps/seedpay/cache/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to clear cache");
      }
      // Invalidate client queries that depend on deals
      queryClient.invalidateQueries({ queryKey: seedpayKeys.deals.root() });
      alert("SeedPay deals cache cleared.");
    } catch (e: any) {
      alert("Failed to clear cache: " + (e?.message || String(e)));
    } finally {
      setClearCacheLoading(false);
    }
  }

  async function runSync() {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/actions/hubspot/sync", {
        quoteId: quoteId.trim(),
        action,
        dryRun,
        includeConnectivity: includeConnInSync,
      });
      setSyncResult(res);
    } catch (e: any) {
      setSyncResult({ error: e?.message || String(e) });
    } finally {
      setSyncLoading(false);
    }
  }

  function TabButton({ value, label }: { value: typeof tab; label: string }) {
    const active = tab === value;
    return (
      <Button
        variant={active ? "default" : "outline"}
        size="sm"
        className="mr-2"
        onClick={() => setTab(value)}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">HubSpot Diagnostics</h1>
          <div className="flex items-center">
            <TabButton value="diagnostics" label="Diagnostics" />
            <TabButton value="metrics" label="Metrics" />
            <TabButton value="logs" label="Logs" />
            <TabButton value="actions" label="Actions" />
          </div>
        </div>

        {tab === "diagnostics" && (
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Smoke Test
              </CardTitle>
              <CardDescription>
                Non-destructive checks.{" "}
                <span title="Performs safe, read‑only calls to HubSpot (pipelines/products) when enabled. No data is created or modified.">
                  <b>Info</b>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeConnectivity}
                    onChange={(e) => setIncludeConnectivity(e.target.checked)}
                  />
                  <span>Include connectivity checks</span>
                  <Info className="h-4 w-4 text-gray-500" />
                </label>
                <Button onClick={runSmokeTest} disabled={diagLoading}>
                  {diagLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Running...
                    </span>
                  ) : (
                    "Run Smoke Test"
                  )}
                </Button>
              </div>

              {diagResult && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    {diagResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {diagResult.success
                        ? "All checks passed"
                        : "Some checks failed"}
                    </span>
                    <Badge
                      variant={diagResult.success ? "default" : "destructive"}
                    >
                      {diagResult.success ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {diagResult.checks.map((c) => (
                      <div
                        key={c.key}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          {c.ok ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span>{c.label}</span>
                          {c.note && (
                            <span className="text-xs text-gray-500">
                              ({c.note})
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{c.error}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-3">
                    {diagResult.disclaimer}
                  </div>
                  {diagResult.detail?.hubspot && (
                    <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-56">
                      {JSON.stringify(diagResult.detail.hubspot, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "metrics" && (
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle>HubSpot Sync Metrics</CardTitle>
              <CardDescription>
                Success/failure counts and durations.{" "}
                <span title="Durations computed over a rolling window. Counts reflect total since last reset.">
                  <b>Info</b>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsQuery.isLoading ? (
                <div className="text-gray-600">Loading metrics…</div>
              ) : metricsQuery.error ? (
                <div className="text-red-600">Failed to load metrics</div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm text-gray-500">Successes</div>
                    <div className="text-2xl font-bold">
                      {metricsQuery.data.successCount}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm text-gray-500">Failures</div>
                    <div className="text-2xl font-bold">
                      {metricsQuery.data.failureCount}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm text-gray-500">
                      Avg Duration (ms)
                    </div>
                    <div className="text-2xl font-bold">
                      {metricsQuery.data.durations?.avgMs || 0}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm text-gray-500">
                      P95 Duration (ms)
                    </div>
                    <div className="text-2xl font-bold">
                      {metricsQuery.data.durations?.p95Ms || 0}
                    </div>
                  </div>
                </div>
              )}
              {metricsQuery.data?.lastFailure && (
                <div className="mt-4">
                  <div className="text-sm font-medium">
                    Last Failure Details
                  </div>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(metricsQuery.data.lastFailure, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "logs" && (
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle>Recent HubSpot Logs</CardTitle>
              <CardDescription>
                Latest entries from the sync pipeline.{" "}
                <span title="Sensitive tokens are redacted automatically.">
                  <b>Info</b>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsQuery.isLoading ? (
                <div className="text-gray-600">Loading logs…</div>
              ) : logsQuery.error ? (
                <div className="text-red-600">Failed to load logs</div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-auto">
                  {logsQuery.data?.logs?.map((l, idx) => (
                    <div key={idx} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">{l.ts}</div>
                        <Badge
                          variant={
                            l.level === "error" ? "destructive" : "secondary"
                          }
                        >
                          {l.level}
                        </Badge>
                      </div>
                      <div className="font-medium">{l.message}</div>
                      {l.context && (
                        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(l.context, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "actions" && (
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle>Sync a Quote</CardTitle>
              <CardDescription>
                Use Dry Run to preview without making changes.
                <span
                  className="ml-1"
                  title="Dry Run performs pricing and mode calculations and contact verification. No HubSpot or DB writes."
                >
                  <b>Info</b>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Quote ID</label>
                  <Input
                    placeholder="e.g. 123"
                    value={quoteId}
                    onChange={(e) => setQuoteId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Action</label>
                  <select
                    className="w-full border rounded h-9 px-2"
                    value={action}
                    onChange={(e) => setAction(e.target.value as any)}
                  >
                    <option value="auto">Auto</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                  />
                  <span>Dry Run (no changes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeConnInSync}
                    onChange={(e) => setIncludeConnInSync(e.target.checked)}
                  />
                  <span>Include connectivity checks</span>
                  <Info className="h-4 w-4 text-gray-500" />
                </label>
                <Button
                  onClick={runSync}
                  disabled={syncLoading || !quoteId.trim()}
                >
                  {syncLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Running…
                    </span>
                  ) : (
                    "Run"
                  )}
                </Button>
              </div>

              {syncResult && (
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-[420px]">
                  {JSON.stringify(syncResult, null, 2)}
                </pre>
              )}

              {/* SeedPay utilities (admin) */}
              <div className="pt-4 mt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">SeedPay Utilities</div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleClearSeedPayCache}
                      variant="outline"
                      size="sm"
                      disabled={clearCacheLoading}
                      data-testid="button-clear-seedpay-cache"
                    >
                      {clearCacheLoading ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />{" "}
                          Clearing…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" /> Clear SeedPay Deals
                          Cache
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
