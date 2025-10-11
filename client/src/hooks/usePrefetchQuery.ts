/**
 * Prefetch Query Hook
 *
 * Utilities for prefetching queries on common navigations.
 * Improves perceived performance by loading data before navigation.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { getQueryTiming, prefetchKeys } from "@/lib/queryConfig";

/**
 * Hook for prefetching queries.
 *
 * @returns Object with prefetch functions for common navigations
 */
export function usePrefetchQuery() {
  const queryClient = useQueryClient();

  /**
   * Prefetch pricing config (used in calculator).
   */
  const prefetchPricingConfig = useCallback(async () => {
    const queryKey = prefetchKeys.pricingConfig;
    const timing = getQueryTiming(queryKey);

    await queryClient.prefetchQuery({
      queryKey,
      queryFn: () => apiRequest("GET", "/api/pricing/config"),
      staleTime: timing.staleTime,
    });
  }, [queryClient]);

  /**
   * Prefetch calculator content.
   */
  const prefetchCalculatorContent = useCallback(async () => {
    const queryKey = prefetchKeys.calculatorContent;
    const timing = getQueryTiming(queryKey);

    await queryClient.prefetchQuery({
      queryKey,
      queryFn: () => apiRequest("GET", "/api/calculator/content"),
      staleTime: timing.staleTime,
    });
  }, [queryClient]);

  /**
   * Prefetch user commissions.
   *
   * @param salesRepId - Optional sales rep ID
   */
  const prefetchCommissions = useCallback(
    async (salesRepId?: string | number) => {
      const queryKey = prefetchKeys.commissions(salesRepId);
      const timing = getQueryTiming(queryKey);

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => apiRequest("GET", "/api/commissions"),
        staleTime: timing.staleTime,
      });
    },
    [queryClient]
  );

  /**
   * Prefetch deals.
   */
  const prefetchDeals = useCallback(async () => {
    const queryKey = prefetchKeys.deals();
    const timing = getQueryTiming(queryKey);

    await queryClient.prefetchQuery({
      queryKey,
      queryFn: () => apiRequest("GET", "/api/deals"),
      staleTime: timing.staleTime,
    });
  }, [queryClient]);

  /**
   * Prefetch all calculator-related data (pricing + content).
   * Call when user navigates toward calculator.
   */
  const prefetchCalculator = useCallback(async () => {
    await Promise.all([prefetchPricingConfig(), prefetchCalculatorContent()]);
  }, [prefetchPricingConfig, prefetchCalculatorContent]);

  /**
   * Prefetch all commission tracker data.
   * Call when user navigates toward commission tracker.
   */
  const prefetchCommissionTracker = useCallback(
    async (salesRepId?: string | number) => {
      await Promise.all([prefetchCommissions(salesRepId), prefetchDeals()]);
    },
    [prefetchCommissions, prefetchDeals]
  );

  return {
    prefetchPricingConfig,
    prefetchCalculatorContent,
    prefetchCommissions,
    prefetchDeals,
    prefetchCalculator,
    prefetchCommissionTracker,
  };
}

/**
 * Higher-order hook that adds prefetching to navigation.
 *
 * Example:
 * ```tsx
 * const navigate = usePrefetchNavigation();
 *
 * // Prefetch calculator data before navigation
 * onClick={() => navigate('/calculator', { prefetch: 'calculator' })}
 * ```
 */
export function usePrefetchNavigation() {
  const prefetch = usePrefetchQuery();

  return useCallback(
    (path: string, options?: { prefetch?: keyof ReturnType<typeof usePrefetchQuery> }) => {
      if (options?.prefetch) {
        const prefetchFn = prefetch[options.prefetch];
        if (typeof prefetchFn === "function") {
          // Fire and forget prefetch
          prefetchFn().catch((error) => {
            console.warn(`Prefetch failed for ${options.prefetch}:`, error);
          });
        }
      }

      // Navigate (using wouter or react-router)
      window.location.href = path;
    },
    [prefetch]
  );
}
