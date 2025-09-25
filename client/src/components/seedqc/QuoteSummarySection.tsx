import React from "react";
import type { FeeCalculation, QuoteSummaryForm } from "./types";

type Props = {
  form: QuoteSummaryForm;
  feeCalculation: FeeCalculation;
  isBreakdownExpanded: boolean;
  onToggleBreakdown: () => void;
};

export function QuoteSummarySection({
  form,
  feeCalculation,
  isBreakdownExpanded,
  onToggleBreakdown,
}: Props) {
  const combinedMonthly = Number(feeCalculation?.combined?.monthlyFee ?? 0);
  const combinedSetup = Number(feeCalculation?.combined?.setupFee ?? 0);

  return (
    <div className="space-y-4">
      {/* Header Total */}
      <div
        className="bg-muted border rounded-2xl p-6 cursor-pointer kb-hover-motion"
        onClick={onToggleBreakdown}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Total Monthly Fee
            </span>
          </div>
          <div className="text-4xl font-bold text-foreground mb-2">
            ${combinedMonthly.toLocaleString()}
            <span className="text-lg font-medium text-muted-foreground">
              {combinedMonthly > 0 ? "/month" : " monthly"}
            </span>
          </div>
          {combinedSetup > 0 && (
            <div className="text-lg text-foreground">
              <span className="font-semibold">
                ${combinedSetup.toLocaleString()}
              </span>
              <span className="text-sm">
                {(form?.watch?.("servicePriorYearFilings") ||
                  form?.watch?.("serviceCfoAdvisory")) &&
                !form?.watch?.("serviceTaasMonthly") &&
                !form?.watch?.("serviceMonthlyBookkeeping")
                  ? " one-time fee"
                  : " setup fee"}
              </span>
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {isBreakdownExpanded
              ? "Click to hide detailed breakdown"
              : "Click to see detailed breakdown"}
          </div>
        </div>
      </div>

      {/* Sleek grouped breakdown with per-service steps */}
      {isBreakdownExpanded && (
        <div className="bg-muted border rounded-xl p-6">
          <h4 className="font-semibold text-foreground mb-4">
            Detailed Breakdown
          </h4>
          {(() => {
            const fmt = (n: number) => `$${Number(n || 0).toLocaleString()}`;
            const watch = form?.watch as any;
            const bk: any = feeCalculation?.bookkeeping || {};
            const bkbd: any = bk?.breakdown || {};
            const taas: any = feeCalculation?.taas || {};
            const taasbd: any = taas?.breakdown || {};
            const payrollFee: number = (feeCalculation as any)?.payrollFee || 0;
            const payrollbd: any = (feeCalculation as any)?.payrollBreakdown || {};
            const apFee: number = (feeCalculation as any)?.apFee || 0;
            const apbd: any = (feeCalculation as any)?.apBreakdown || {};
            const arFee: number = (feeCalculation as any)?.arFee || 0;
            const arbd: any = (feeCalculation as any)?.arBreakdown || {};
            const agentFee: number = (feeCalculation as any)?.agentOfServiceFee || 0;
            const agentbd: any = (feeCalculation as any)?.agentOfServiceBreakdown || {};
            const qboFee: number = (feeCalculation as any)?.qboFee || 0;
            const tierFee: number = (feeCalculation as any)?.serviceTierFee || 0;
            const tierName: string = watch?.("serviceTier") || "";
            const cleanupFee = Number(feeCalculation?.cleanupProjectFee || 0);
            const cleanupCount = (watch?.("cleanupPeriods") || []).length || 0;
            const priorFee = Number(feeCalculation?.priorYearFilingsFee || 0);
            const priorYears = (watch?.("priorYearFilings") || []).length || 0;
            const cfoFee = Number((feeCalculation as any)?.cfoAdvisoryFee || 0);
            const cfoType: string = watch?.("cfoAdvisoryType") || "";

            return (
              <div className="space-y-6 text-sm">
                {/* Monthly group */}
                <div>
                  <div className="uppercase tracking-wide text-xs text-muted-foreground mb-2">
                    Monthly Fees
                  </div>
                  <div className="space-y-3">
                    {watch?.("serviceMonthlyBookkeeping") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Bookkeeping</span>
                          <span className="font-semibold">{fmt(bk?.monthlyFee || 0)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Base {fmt(bkbd.baseFee || 0)} + Tx {fmt(bkbd.transactionUpcharge || 0)} = {fmt(bkbd.beforeMultipliers || 0)} → × Rev {bkbd.revenueMultiplier ?? 1} × Ind {bkbd.industryMultiplier ?? 1}
                          {bkbd.monthlyFeeAfterDiscount !== undefined && bkbd.monthlyFeeBeforeDiscount !== undefined
                            ? ` → Disc ${bkbd.discountPercentage ?? Math.round((1 - (bkbd.monthlyFeeAfterDiscount || 0) / Math.max(bkbd.monthlyFeeBeforeDiscount || 1, 1)) * 100)}% → ${fmt(bkbd.monthlyFeeAfterDiscount || bk?.monthlyFee || 0)}`
                            : ` → ${fmt(bkbd.afterMultipliers || bk?.monthlyFee || 0)}`}
                        </div>
                      </div>
                    )}

                    {watch?.("serviceTaasMonthly") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Tax as a Service</span>
                          <span className="font-semibold">{fmt(taas?.monthlyFee || 0)}</span>
                        </div>
                        {(() => {
                          const tb: any = taasbd || {};
                          const tBase = typeof tb.baseFee === "number" ? tb.baseFee : 150; // fallback to known constant
                          const tEnt = Number(tb.entityUpcharge || 0);
                          const tSt = Number(tb.stateUpcharge || 0);
                          const tIntl = Number(tb.intlUpcharge || 0);
                          const tOwn = Number(tb.ownerUpcharge || 0);
                          const tQual = Number(tb.bookUpcharge || 0);
                          const t1040 = Number(tb.personal1040 || 0);
                          const tBefore = typeof tb.beforeMultipliers === "number" ? tb.beforeMultipliers : (tBase + tEnt + tSt + tIntl + tOwn + tQual + t1040);
                          const tInd = tb.industryMultiplier ?? 1;
                          const tRev = tb.revenueMultiplier ?? 1;
                          return (
                            <div className="text-xs text-muted-foreground mt-1">
                              {`Base ${fmt(tBase)} + Ent ${fmt(tEnt)} + St ${fmt(tSt)} + Intl ${fmt(tIntl)} + Own ${fmt(tOwn)} + Qual ${fmt(tQual)} + 1040 ${fmt(t1040)} = ${fmt(tBefore)} → × Ind ${tInd} × Rev ${tRev} → ${fmt(taas?.monthlyFee || 0)}`}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {payrollFee > 0 && watch?.("servicePayrollService") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Payroll</span>
                          <span className="font-semibold">{fmt(payrollFee)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Base {fmt(payrollbd.baseFee || 0)} + Emp {fmt(payrollbd.additionalEmployeeFee || 0)} + St {fmt(payrollbd.additionalStateFee || 0)} → {fmt(payrollFee)}
                        </div>
                      </div>
                    )}

                    {apFee > 0 && watch?.("serviceApArService") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Accounts Payable ({apbd?.apServiceTier || "tier"})</span>
                          <span className="font-semibold">{fmt(apFee)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Base {fmt(apbd.baseFee || 0)} + Surcharge {fmt(apbd.vendorSurcharge || 0)}{String(apbd?.apServiceTier || "") === "advanced" ? ` → × 2.5` : ""} → {fmt(apFee)}
                        </div>
                      </div>
                    )}

                    {arFee > 0 && watch?.("serviceArService") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Accounts Receivable ({arbd?.arServiceTier || "tier"})</span>
                          <span className="font-semibold">{fmt(arFee)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Base {fmt(arbd.baseFee || 0)} + Surcharge {fmt(arbd.customerSurcharge || 0)}{String(arbd?.arServiceTier || "") === "advanced" ? ` → × 2.5` : ""} → {fmt(arFee)}
                        </div>
                      </div>
                    )}

                    {tierFee > 0 && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Service Tier ({tierName})</span>
                          <span className="font-semibold">{fmt(tierFee)}</span>
                        </div>
                      </div>
                    )}

                    {qboFee > 0 && watch?.("qboSubscription") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">QBO Subscription</span>
                          <span className="font-semibold">{fmt(qboFee)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* One-time group */}
                <div>
                  <div className="uppercase tracking-wide text-xs text-muted-foreground mb-2">
                    One-time / Setup Fees
                  </div>
                  <div className="space-y-3">
                    {/* Bookkeeping setup fee when monthly bookkeeping is selected */}
                    {watch?.("serviceMonthlyBookkeeping") && (bk?.setupFee || 0) > 0 && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Monthly Bookkeeping Setup Fee</span>
                          <span className="font-semibold">{fmt(bk?.setupFee || 0)}</span>
                        </div>
                      </div>
                    )}

                    {priorFee > 0 && watch?.("servicePriorYearFilings") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Prior Year Filings{priorYears ? ` (${priorYears} yr)` : ""}</span>
                          <span className="font-semibold">{fmt(priorFee)}</span>
                        </div>
                      </div>
                    )}

                    {cleanupFee > 0 && watch?.("serviceCleanupProjects") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Cleanup Projects{cleanupCount ? ` (${cleanupCount} mo)` : ""}</span>
                          <span className="font-semibold">{fmt(cleanupFee)}</span>
                        </div>
                      </div>
                    )}

                    {agentFee > 0 && watch?.("serviceAgentOfService") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Agent of Service</span>
                          <span className="font-semibold">{fmt(agentFee)}</span>
                        </div>
                        {agentbd && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Base {fmt(agentbd.baseFee || 0)} + States {fmt(agentbd.additionalStatesFee || 0)}{agentbd.complexCase ? ` + Complex ${fmt(agentbd.complexCaseFee || 0)}` : ""} → {fmt(agentFee)}
                          </div>
                        )}
                      </div>
                    )}

                    {cfoFee > 0 && watch?.("serviceCfoAdvisory") && (
                      <div className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">CFO Advisory{cfoType ? ` (${cfoType.replace(/_/g, " ")})` : ""}</span>
                          <span className="font-semibold">{fmt(cfoFee)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="text-center bg-muted rounded-lg p-4 border">
        <p className="text-xs text-muted-foreground">Quote valid for 30 days</p>
      </div>
    </div>
  );
}
