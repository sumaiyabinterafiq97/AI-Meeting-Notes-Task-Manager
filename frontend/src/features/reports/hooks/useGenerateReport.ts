import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '../services/report-api';
import { reportKeys } from './report-keys';
import type { GenerateReportPayload } from '../types/report.types';

export function useGenerateReport(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateReportPayload) => {
      const { data } = await reportApi.generate(workspaceId!, payload);
      return data;
    },
    onSuccess: (report) => {
      if (!workspaceId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: reportKeys.list(workspaceId) });
      queryClient.setQueryData(reportKeys.detail(workspaceId, report.id), report);
    },
  });
}
