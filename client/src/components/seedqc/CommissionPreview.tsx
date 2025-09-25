import React from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { KbCard } from "@/components/seedkb/KbCard";

type Props = {
  setupFee: number;
  monthlyFee: number;
};

export function CommissionPreview({ setupFee, monthlyFee }: Props) {
  const totalSetupFee = Number(setupFee || 0);
  const totalMonthlyFee = Number(monthlyFee || 0);

  // Month 1 Commission: 20% of setup fee + 40% of monthly fee
  const month1SetupCommission = totalSetupFee * 0.2;
  const month1MonthlyCommission = totalMonthlyFee * 0.4;
  const totalMonth1Commission = month1SetupCommission + month1MonthlyCommission;

  // Ongoing Commission: 10% of monthly fee for months 2-12
  const ongoingMonthlyCommission = totalMonthlyFee * 0.1;
  const totalOngoingCommission = ongoingMonthlyCommission * 11;

  // Total first year commission
  const totalFirstYearCommission =
    totalMonth1Commission + totalOngoingCommission;

  return (
    <KbCard className="p-6 mb-8">
      <div className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-lg">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Commission Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your earnings from this quote
            </p>
          </div>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Month 1 Commission */}
          <div className="rounded-lg p-6 border bg-muted">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Month 1 Commission
              </h3>
              <div className="text-2xl font-bold text-green-600">
                {`$${totalMonth1Commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
            </div>
            <div className="space-y-2">
              {totalSetupFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Setup Fee (20%):
                  </span>
                  <span className="font-semibold text-foreground">
                    {`$${month1SetupCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Monthly Fee (40%):
                </span>
                <span className="font-semibold text-foreground">
                  {`$${month1MonthlyCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Total Month 1:
                  </span>
                  <span className="text-lg font-bold text-green-500">
                    {`$${totalMonth1Commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ongoing Commission */}
          <div className="rounded-lg p-6 border bg-muted">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Ongoing Monthly
              </h3>
              <div className="text-2xl font-bold text-green-600">
                {`$${ongoingMonthlyCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Monthly Fee (10%):
                </span>
                <span className="font-semibold text-foreground">
                  {`$${ongoingMonthlyCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Months 2-12 (11 payments)
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Total Ongoing:
                  </span>
                  <span className="text-lg font-bold text-green-500">
                    {`$${totalOngoingCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Total First Year Commission */}
        <div className="mt-6 rounded-lg p-6 border bg-muted">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Total First Year Commission
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Combined earnings for months 1-12
              </p>
            </div>
            <div className="text-3xl font-bold text-green-500">
              {`$${totalFirstYearCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
          </div>
        </div>
      </div>
    </KbCard>
  );
}
