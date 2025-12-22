/**
 * 💰 PRICING DISPLAY PANEL
 * Maximum 150 lines - pricing visualization only!
 * Clean, beautiful pricing display with proper formatting
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Calculator,
  CheckCircle2,
} from "lucide-react";

import type {
  PricingCalculationResult,
  QuoteFormData,
} from "../../types/QuoteTypes";

interface PricingDisplayPanelProps {
  calculation: PricingCalculationResult;
  formData: QuoteFormData;
}

export const PricingDisplayPanel: React.FC<PricingDisplayPanelProps> = ({
  calculation,
  formData,
}) => {
  // Helper to format currency with safety check
  const formatCurrency = (amount: number | undefined) => {
    return `$${(amount || 0).toLocaleString()}`;
  };

  // Calculate savings display using shared adapter data when available
  // Fallback: compute from bookkeeping.breakdown before/after (already provided by shared)
  const bk: any = calculation.bookkeeping as any;
  const computedDiscount =
    typeof bk?.breakdown?.monthlyFeeBeforeDiscount === "number" &&
    typeof bk?.breakdown?.monthlyFeeAfterDiscount === "number"
      ? Math.max(
          0,
          bk.breakdown.monthlyFeeBeforeDiscount -
            bk.breakdown.monthlyFeeAfterDiscount,
        )
      : 0;
  const packageDiscountMonthly =
    (calculation as any).packageDiscountMonthly ?? computedDiscount;
  const bookkeepingPackageDiscount =
    calculation.includesBookkeeping && calculation.includesTaas
      ? packageDiscountMonthly
      : 0;

  return (
    <div className="space-y-6">
      {/* Main Pricing Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="w-6 h-6 text-blue-600" />
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Fee */}
          <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold text-gray-900">Monthly Total</div>
                <div className="text-sm text-gray-600">
                  Recurring monthly fees
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(calculation.totalMonthlyFee)}
              </div>
              <div className="text-xs text-gray-500">per month</div>
            </div>
          </div>

          {/* Setup Fee */}
          <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold text-gray-900">Setup Total</div>
                <div className="text-sm text-gray-600">
                  One-time implementation
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(calculation.totalSetupFee)}
              </div>
              <div className="text-xs text-gray-500">one-time</div>
            </div>
          </div>

          {/* Package Savings Display */}
          {bookkeepingPackageDiscount > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Bookkeeping Package Savings
                </span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  -{formatCurrency(bookkeepingPackageDiscount)}/month
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-600" />
            Service Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Core Services */}
          {calculation.includesBookkeeping && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Monthly Bookkeeping</span>
                {bookkeepingPackageDiscount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    50% off
                  </Badge>
                )}
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.bookkeeping.monthlyFee)}/mo
              </div>
            </div>
          )}

          {calculation.includesTaas && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm">Tax as a Service</span>
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.taas.monthlyFee)}/mo
              </div>
            </div>
          )}

          {/* Service Tier */}
          {calculation.serviceTierFee > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-sm">
                  Service Tier ({formData.serviceTier})
                </span>
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.serviceTierFee)}/mo
              </div>
            </div>
          )}

          {/* Additional Services */}
          {calculation.payrollFee > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                <span className="text-sm">Payroll Service</span>
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.payrollFee)}/mo
              </div>
            </div>
          )}

          {calculation.apFee > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full" />
                <span className="text-sm">Accounts Payable</span>
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.apFee)}/mo
              </div>
            </div>
          )}

          {calculation.arFee > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                <span className="text-sm">Accounts Receivable</span>
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.arFee)}/mo
              </div>
            </div>
          )}

          {calculation.agentOfServiceFee > 0 && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                <span className="text-sm">Agent of Service</span>
              </div>
              <div className="font-medium">
                {formatCurrency(calculation.agentOfServiceFee)}/mo
              </div>
            </div>
          )}

          {/* One-time Services */}
          {(calculation.cleanupProjectFee > 0 ||
            calculation.priorYearFilingsFee > 0 ||
            calculation.cfoAdvisoryFee > 0) && (
            <>
              <Separator className="my-3" />
              <div className="text-sm font-medium text-gray-700 mb-2">
                One-Time Services
              </div>

              {calculation.cleanupProjectFee > 0 && (
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-sm">Cleanup Project</span>
                  </div>
                  <div className="font-medium">
                    {formatCurrency(calculation.cleanupProjectFee)}
                  </div>
                </div>
              )}

              {calculation.priorYearFilingsFee > 0 && (
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-sm">Prior Year Filings</span>
                  </div>
                  <div className="font-medium">
                    {formatCurrency(calculation.priorYearFilingsFee)}
                  </div>
                </div>
              )}

              {calculation.cfoAdvisoryFee > 0 && (
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full" />
                    <span className="text-sm">CFO Advisory</span>
                  </div>
                  <div className="font-medium">
                    {formatCurrency(calculation.cfoAdvisoryFee)}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
