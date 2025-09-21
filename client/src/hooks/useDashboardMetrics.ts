import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

interface DashboardMetrics {
  pipelineValue: number;
  activeDeals: number;
  mtdRevenue: number;
}

export function useDashboardMetrics() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/dashboard/metrics', user?.email],
    queryFn: async (): Promise<DashboardMetrics> => {
      return await apiRequest('/api/dashboard/metrics');
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    enabled: !!user?.email, // Only run query when user is authenticated
  });
}