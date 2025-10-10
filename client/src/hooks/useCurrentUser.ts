import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface CurrentUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  profilePhoto?: string | null;
  // Optional future fields
  permissions?: string[];
  roles?: string[];
}

export function useCurrentUser() {
  const query = useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const user = await apiFetch<CurrentUser>("GET", "/api/user");
        return user as CurrentUser;
      } catch (err) {
        // If unauthenticated, return null to allow UI to show login
        return null;
      }
    },
    staleTime: 60_000,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
