import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../services/report-api';
import { reportKeys } from './report-keys';

export function useReports(workspaceId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.list(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await reportApi.list(workspaceId!);
      return data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
