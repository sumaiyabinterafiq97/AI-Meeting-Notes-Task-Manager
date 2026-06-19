import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '../services/insights-api';
import { dashboardInsightsKeys } from './dashboard-insights-keys';

export function useDashboardInsights(workspaceId: string | undefined) {
  return useQuery({
    queryKey: dashboardInsightsKeys.detail(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await insightsApi.getWorkspace(workspaceId!);
      return data;
    },
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}
