import React from "react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommissionSummary } from "@/hooks/useCommissionSummary";
import { Shield } from "lucide-react";

export default function SeedPaySettingsPanel() {
  const { data: summary } = useCommissionSummary();

  return (
    <PermissionGuard
      permissions={PERMISSIONS.MANAGE_COMMISSIONS}
      fallback={<div>Access denied</div>}
    >
      <div className="space-y-4">
        <Card className="border shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-600" /> Current Period Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="text-sm text-foreground grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground">Total Commissions</div>
                  <div className="font-semibold">
                    ${summary.total_commissions?.toLocaleString?.() ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Paid Invoices</div>
                  <div className="font-semibold">{summary.invoice_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Active Subscriptions</div>
                  <div className="font-semibold">{summary.subscription_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Period</div>
                  <div className="font-semibold">
                    {summary.period_start
                      ? new Date(summary.period_start).toLocaleDateString()
                      : "—"}{" "}
                    – {summary.period_end ? new Date(summary.period_end).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No summary available.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
