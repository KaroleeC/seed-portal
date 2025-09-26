import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { coreKeys } from "@/lib/queryKeys";

export type SalesRepListItem = {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
  hubspotUserId?: string | null;
}[];

export function useSalesRepList(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery<SalesRepListItem>({
    queryKey: coreKeys.salesReps.list(),
    enabled,
    queryFn: async () => {
      const data = await apiRequest<any[]>("GET", "/api/sales-reps");
      // Normalize minimal shape expected by admin tools
      return (data || []).map((rep: any) => ({
        id: Number(rep.id ?? rep.userId ?? 0),
        name:
          rep.name || `${rep.first_name || ""} ${rep.last_name || ""}`.trim(),
        email: rep.email || rep.userEmail || "",
        isActive: rep.isActive ?? rep.is_active ?? true,
        hubspotUserId: rep.hubspotUserId ?? rep.hubspot_user_id ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
