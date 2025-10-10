import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { seedpayKeys } from "@/lib/queryKeys";

export type SalesRepMe = {
  id: number;
  name?: string | null;
  email?: string | null;
  hubspotUserId?: string | null;
} | null;

export function useSalesRepMe(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery<SalesRepMe>({
    queryKey: seedpayKeys.salesReps.me(),
    enabled,
    queryFn: async () => {
      try {
        return await apiRequest<SalesRepMe>("GET", "/api/apps/seedpay/sales-reps/me");
      } catch (e) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
