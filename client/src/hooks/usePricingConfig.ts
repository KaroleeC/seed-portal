import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PricingConfig } from "@shared/pricing-config";
import { seedqcKeys } from "@/lib/queryKeys";

export function usePricingConfig() {
  return useQuery<PricingConfig>({
    queryKey: seedqcKeys.pricing.config(),
    queryFn: async () => {
      try {
        const data = await apiRequest("/api/apps/seedqc/pricing/config");
        return data as PricingConfig;
      } catch (err) {
        console.error(
          "[usePricingConfig] falling back to defaults due to error:",
          err,
        );
        // Provide a minimal fallback so downstream mapping can proceed without throwing
        const fallback: any = {
          baseFees: { bookkeeping: 150 },
          serviceSettings: { bookkeeping: { qbo_subscription_fee: 60 } },
        };
        return fallback as PricingConfig;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
