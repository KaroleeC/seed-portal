import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CombinedFeeResult } from "@shared/pricing";

interface PricingDisplayProps {
  feeCalculation: CombinedFeeResult;
  currentFormView: "bookkeeping" | "taas";
  canNavigateLeft: boolean;
  canNavigateRight: boolean;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  isBreakdownExpanded: boolean;
  onToggleBreakdown: () => void;
}

export function PricingDisplay({
  feeCalculation,
  currentFormView,
  canNavigateLeft,
  canNavigateRight,
  onNavigateLeft,
  onNavigateRight,
  isBreakdownExpanded,
  onToggleBreakdown,
}: PricingDisplayProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-800">Pricing Summary</CardTitle>
          {feeCalculation.includesBookkeeping && feeCalculation.includesTaas && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNavigateLeft}
                disabled={!canNavigateLeft}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-0">
                {currentFormView === "bookkeeping" ? "Bookkeeping" : "Tax Service"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNavigateRight}
                disabled={!canNavigateRight}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Combined totals always shown first */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-800">Total Monthly Fee:</span>
            <span className="text-2xl font-bold text-[#e24c00]">
              {formatCurrency(feeCalculation.combined.monthlyFee)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total Setup Fee:</span>
            <span className="text-2xl font-bold text-[#e24c00]">
              {formatCurrency(feeCalculation.combined.setupFee)}
            </span>
          </div>
        </div>

        {/* Service breakdown - show if any services are included */}
        {(feeCalculation.includesBookkeeping ||
          feeCalculation.includesTaas ||
          feeCalculation.includesAP ||
          feeCalculation.includesAR ||
          feeCalculation.includesAgentOfService) && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onToggleBreakdown}
              className="w-full text-sm"
            >
              {isBreakdownExpanded ? "Hide" : "Show"} Service Breakdown
            </Button>

            {isBreakdownExpanded && (
              <div className="space-y-3">
                {feeCalculation.includesBookkeeping && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Bookkeeping Service</h4>
                    <div className="flex justify-between text-sm">
                      <span>Monthly:</span>
                      <span className="font-semibold">
                        {formatCurrency(feeCalculation.bookkeeping.monthlyFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Setup:</span>
                      <span className="font-semibold">
                        {formatCurrency(feeCalculation.bookkeeping.setupFee)}
                      </span>
                    </div>
                  </div>
                )}

                {feeCalculation.includesTaas && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">Tax Service</h4>
                    <div className="flex justify-between text-sm">
                      <span>Monthly:</span>
                      <span className="font-semibold">
                        {formatCurrency(feeCalculation.taas.monthlyFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Setup:</span>
                      <span className="font-semibold">
                        {formatCurrency(feeCalculation.taas.setupFee)}
                      </span>
                    </div>
                  </div>
                )}

                {feeCalculation.includesAP && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-2">Accounts Payable Service</h4>
                    <div className="flex justify-between text-sm">
                      <span>Monthly:</span>
                      <span className="font-semibold">{formatCurrency(feeCalculation.apFee)}</span>
                    </div>
                  </div>
                )}

                {feeCalculation.includesAR && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-2">
                      Accounts Receivable Service
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span>Monthly:</span>
                      <span className="font-semibold">{formatCurrency(feeCalculation.arFee)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
