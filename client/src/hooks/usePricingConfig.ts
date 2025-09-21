import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { PricingConfig } from '@shared/pricing-config';
import { seedqcKeys } from '@/lib/queryKeys';

export function usePricingConfig() {
  return useQuery<PricingConfig>({
    queryKey: seedqcKeys.pricing.config(),
    queryFn: async () => {
      const data = await apiRequest('/api/apps/seedqc/pricing/config');
      return data as PricingConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
}
