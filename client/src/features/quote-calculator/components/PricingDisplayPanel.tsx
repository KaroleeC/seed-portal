import { Calculator, Copy, Sparkles, ArrowUpDown, TrendingUp, Info, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PricingDisplayPanelProps {
  feeCalculation: any;
  isCalculated: boolean;
  isBreakdownExpanded: boolean;
  setIsBreakdownExpanded: (expanded: boolean) => void;
}

export function PricingDisplayPanel({ 
  feeCalculation, 
  isCalculated, 
  isBreakdownExpanded, 
  setIsBreakdownExpanded 
}: PricingDisplayPanelProps) {
  if (!isCalculated) return null;

  const setupCommission = feeCalculation.combined.setupFee * 0.2;
  const firstMonthCommission = feeCalculation.combined.monthlyFee * 0.4;
  const monthlyCommission = feeCalculation.combined.monthlyFee * 0.1;
  const firstMonth = setupCommission + firstMonthCommission;
  const annualTotal = firstMonth + (monthlyCommission * 11);

  return (
    <>
      {/* Pricing Summary */}
      <Card className="bg-white shadow-xl border-0 quote-card">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] rounded-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Pricing Summary</h2>
              <p className="text-sm text-gray-500">Your calculated quote breakdown</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Combined Total */}
            {(feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                      <Calculator className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-purple-800">Combined Total</h4>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm" onClick={() => navigator.clipboard?.writeText(feeCalculation.combined.monthlyFee.toLocaleString())}>
                    <Copy className="h-3 w-3 mr-1" />Copy
                  </Button>
                </div>
                <div className="text-3xl font-bold text-purple-800 mb-2">${feeCalculation.combined.monthlyFee.toLocaleString()} / mo</div>
                <div className="text-xl font-semibold text-purple-700 mb-2">${feeCalculation.combined.setupFee.toLocaleString()} total setup</div>
                <p className="text-sm text-purple-600">Complete bookkeeping and tax services package</p>
              </div>
            )}

            {/* Bookkeeping Only */}
            {(feeCalculation.includesBookkeeping && !feeCalculation.includesTaas) && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-green-800">Bookkeeping Package Total</h4>
                  <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-sm" onClick={() => navigator.clipboard?.writeText(feeCalculation.bookkeeping.monthlyFee.toLocaleString())}>
                    <Copy className="h-3 w-3 mr-1" />Copy
                  </Button>
                </div>
                <div className="text-3xl font-bold text-green-800 mb-2">${feeCalculation.bookkeeping.monthlyFee.toLocaleString()} / mo</div>
                <div className="text-xl font-semibold text-green-700">${feeCalculation.bookkeeping.setupFee.toLocaleString()} setup fee</div>
              </div>
            )}

            {/* TaaS Only */}
            {(!feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-800">TaaS Package Total</h4>
                  <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => navigator.clipboard?.writeText(feeCalculation.taas.monthlyFee.toLocaleString())}>
                    <Copy className="h-3 w-3 mr-1" />Copy
                  </Button>
                </div>
                <div className="text-3xl font-bold text-blue-800 mb-2">${feeCalculation.taas.monthlyFee.toLocaleString()} / mo</div>
                <div className="text-xl font-semibold text-blue-700">${feeCalculation.taas.setupFee.toLocaleString()} prior years fee</div>
              </div>
            )}

            {/* No Services */}
            {(!feeCalculation.includesBookkeeping && !feeCalculation.includesTaas) && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-500" />
                <h4 className="font-semibold text-gray-600 mb-1">No Services Selected</h4>
                <p className="text-sm text-gray-500">Click on the service cards above to start building your quote</p>
              </div>
            )}

            {/* Breakdown Toggle */}
            {(feeCalculation.includesBookkeeping || feeCalculation.includesTaas) && (
              <div className="border-t pt-6">
                <button type="button" onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)} className="flex items-center gap-2 mb-4 w-full text-left hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-bold text-gray-800 flex-1">Calculation Breakdown</h3>
                  <div className={`transition-transform duration-200 ${isBreakdownExpanded ? 'rotate-180' : ''}`}>
                    <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  </div>
                </button>
                {isBreakdownExpanded && (
                  <div className="space-y-4">
                    {feeCalculation.includesBookkeeping && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="font-medium text-green-800 mb-2">Bookkeeping Service</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-green-600">Monthly Fee:</span><span className="font-medium text-green-800">${feeCalculation.bookkeeping.monthlyFee.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-green-600">Setup/Cleanup Fee:</span><span className="font-medium text-green-800">${feeCalculation.bookkeeping.setupFee.toLocaleString()}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commission Estimation */}
      {(feeCalculation.combined.monthlyFee > 0 || feeCalculation.combined.setupFee > 0) && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Projected Commission</h3>
                <p className="text-sm text-gray-600">Based on current pricing</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-yellow-300 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-700 mb-1">${Math.round(firstMonth).toLocaleString()}</div>
                <div className="text-sm font-medium text-yellow-600">First Month</div>
              </div>
              <div className="bg-white border border-orange-300 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-700 mb-1">${Math.round(monthlyCommission).toLocaleString()}</div>
                <div className="text-sm font-medium text-orange-600">Monthly Recurring</div>
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold mb-1">${Math.round(annualTotal).toLocaleString()}</div>
                <div className="text-sm font-medium">12-Month Total</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white border border-yellow-300 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>Commission rates: 20% setup, 40% first month, 10% recurring</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}