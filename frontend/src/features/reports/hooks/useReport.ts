import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../services/report-api';
import { reportKeys } from './report-keys';

export function useReport(workspaceId: string | undefined, reportId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(workspaceId ?? '', reportId ?? ''),
    queryFn: async () => {
      const { data } = await reportApi.getById(workspaceId!, reportId!);
      return data;
    },
    enabled: Boolean(workspaceId && reportId),
  });
}
