import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboard-api';
import { dashboardKeys } from './dashboard-keys';

export function useDashboard(workspaceId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.detail(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await dashboardApi.get(workspaceId!);
      return data;
    },
    enabled: Boolean(workspaceId),
  });
}
