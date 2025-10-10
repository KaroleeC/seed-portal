import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";

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

export default function HubspotDiagnosticsPanel() {
  const [includeConnectivity, setIncludeConnectivity] = useState(true);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<SmokeResult | null>(null);

  // Optional metrics preview (lazy)
  const metricsQuery = useQuery({
    queryKey: ["/api/admin/metrics/hubspot"],
    queryFn: async () => await apiRequest("GET", "/api/admin/metrics/hubspot"),
    enabled: false,
  });

  async function runSmokeTest() {
    setDiagLoading(true);
    try {
      const res = await apiRequest<SmokeResult>("POST", "/api/admin/diagnostics/hubspot/smoke", {
        includeConnectivity,
      });
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

  return (
    <div className="space-y-3 text-xs">
      <Card className="bg-white/95">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">Smoke Test</CardTitle>
          <CardDescription className="text-xs">
            Non-destructive checks.{" "}
            <span title="Performs safe, read‑only calls to HubSpot (pipelines/products) when enabled. No data is created or modified.">
              <b>Info</b>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeConnectivity}
                onChange={(e) => setIncludeConnectivity(e.target.checked)}
              />
              <span>Include connectivity checks</span>
              <Info className="h-4 w-4 text-gray-500" />
            </label>
            <Button size="sm" className="h-8 px-3" onClick={runSmokeTest} disabled={diagLoading}>
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
              <div className="flex items-center gap-2 mb-2">
                {diagResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {diagResult.success ? "All checks passed" : "Some checks failed"}
                </span>
                <Badge variant={diagResult.success ? "default" : "destructive"}>
                  {diagResult.success ? "PASS" : "FAIL"}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {diagResult.checks.map((c) => (
                  <div key={c.key} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {c.ok ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span>{c.label}</span>
                      {c.note && <span className="text-xs text-gray-500">({c.note})</span>}
                    </div>
                    <div className="text-sm text-gray-600">{c.error}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">{diagResult.disclaimer}</div>
              {diagResult.detail?.hubspot && (
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-56">
                  {JSON.stringify(diagResult.detail.hubspot, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/95">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">Metrics (preview)</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={() => metricsQuery.refetch()}
            disabled={metricsQuery.isFetching}
          >
            {metricsQuery.isFetching ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </span>
            ) : (
              "Load metrics"
            )}
          </Button>
          {metricsQuery.data && (
            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
              {JSON.stringify(metricsQuery.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
