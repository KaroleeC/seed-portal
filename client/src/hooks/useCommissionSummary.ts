import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CommissionSummary } from "@shared/contracts";
import { seedpayKeys } from "@/lib/queryKeys";

/**
 * Typed hook to fetch the current period commission summary for SeedPay.
 * Centralizes query key, URL, typing, and default caching behavior.
 */
export function useCommissionSummary(options?: {
  enabled?: boolean;
  staleTimeMs?: number;
  refetchIntervalMs?: number;
}) {
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTimeMs ?? 5 * 60 * 1000;
  const refetchInterval = options?.refetchIntervalMs ?? 5 * 60 * 1000;

  return useQuery<CommissionSummary | null>({
    queryKey: seedpayKeys.commissions.summary(),
    enabled,
    staleTime,
    refetchInterval,
    queryFn: async () => {
      try {
        return await apiRequest<CommissionSummary>(
          "GET",
          "/api/apps/seedpay/commissions/current-period-summary",
        );
      } catch (e) {
        // Return null rather than throw to keep UIs resilient
        return null;
      }
    },
  });
}
