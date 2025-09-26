import React from "react";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommissionSummary } from "@/hooks/useCommissionSummary";
import { Shield, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SeedPaySettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: summary } = useCommissionSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-5xl mx-auto p-6">
        <UniversalNavbar showBackButton={true} />

        <div className="mb-8">
          <div className="flex items-center gap-2 text-white">
            <DollarSign className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Commission Tracker Settings</h1>
          </div>
          <p className="text-white/80 mt-1">
            Read-only diagnostics for SeedPay. Full configuration to follow.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-600" /> Current Period
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="text-sm text-foreground grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground">
                      Total Commissions
                    </div>
                    <div className="font-semibold">
                      ${summary.total_commissions?.toLocaleString?.() ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Paid Invoices</div>
                    <div className="font-semibold">
                      {summary.invoice_count ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      Active Subscriptions
                    </div>
                    <div className="font-semibold">
                      {summary.subscription_count ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Period</div>
                    <div className="font-semibold">
                      {summary.period_start
                        ? new Date(summary.period_start).toLocaleDateString()
                        : "—"}{" "}
                      –{" "}
                      {summary.period_end
                        ? new Date(summary.period_end).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No summary available.
                </div>
              )}
            </CardContent>
          </Card>

          {!isAdmin && (
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle>Access</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This area is visible to admins only. You have limited
                visibility.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
