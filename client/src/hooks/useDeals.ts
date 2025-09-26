import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { DealsResult } from "@shared/contracts";
import { seedpayKeys } from "@/lib/queryKeys";

export function useDealsAll(options?: {
  enabled?: boolean;
  limit?: number;
  ownerId?: string;
}) {
  const enabled = options?.enabled ?? true;
  const limit = options?.limit;
  const ownerId = options?.ownerId;

  return useQuery<DealsResult>({
    queryKey: seedpayKeys.deals.list({ ownerId, limit }),
    enabled,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (typeof limit === "number") qs.set("limit", String(limit));
      if (ownerId) qs.set("ownerId", ownerId);
      const url = qs.toString()
        ? `/api/apps/seedpay/deals?${qs.toString()}`
        : "/api/apps/seedpay/deals";
      return await apiRequest<DealsResult>("GET", url);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDealsByOwner(
  ownerId: string | undefined,
  options?: { enabled?: boolean; limit?: number },
) {
  const enabled = (options?.enabled ?? true) && !!ownerId;
  const limit = options?.limit;

  return useQuery<DealsResult | null>({
    queryKey: seedpayKeys.deals.byOwner(ownerId, limit),
    enabled,
    queryFn: async () => {
      if (!ownerId) return null;
      const qs = new URLSearchParams();
      qs.set("ownerId", ownerId);
      if (typeof limit === "number") qs.set("limit", String(limit));
      return await apiRequest<DealsResult>(
        "GET",
        `/api/apps/seedpay/deals/by-owner?${qs.toString()}`,
      );
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDealsByIds(
  ids: string[] | undefined,
  options?: { enabled?: boolean; limit?: number },
) {
  const enabled = (options?.enabled ?? true) && !!ids && ids.length > 0;
  const limit = options?.limit;

  return useQuery<DealsResult | null>({
    queryKey: seedpayKeys.deals.byIds(ids, limit),
    enabled,
    queryFn: async () => {
      if (!ids || ids.length === 0) return null;
      const qs = new URLSearchParams();
      qs.set("ids", ids.join(","));
      if (typeof limit === "number") qs.set("limit", String(limit));
      return await apiRequest<DealsResult>(
        "GET",
        `/api/apps/seedpay/deals?${qs.toString()}`,
      );
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
