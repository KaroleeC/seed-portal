import { useMemo } from 'react';
import { calculateCombinedFees, type PricingData, type CombinedFeeResult } from '@shared/pricing';

export function usePricingCalculation(data: PricingData): CombinedFeeResult {
  return useMemo(() => {
    return calculateCombinedFees(data);
  }, [
    data.revenueBand,
    data.monthlyTransactions,
    data.industry,
    data.cleanupMonths,
    data.cleanupComplexity,
    data.cleanupOverride,
    data.includesTaas,
    data.numEntities,
    data.statesFiled,
    data.internationalFiling,
    data.numBusinessOwners,
    data.include1040s,
    data.priorYearsUnfiled,
    data.entityType,
    data.bookkeepingQuality,
  ]);
}