import { apiClient } from '@/lib/api-client';
import type { GenerateReportPayload, WorkspaceReport } from '../types/report.types';

export const reportApi = {
  list: (workspaceId: string) =>
    apiClient.get<{ data: WorkspaceReport[] }>(`/workspaces/${workspaceId}/reports`),

  getById: (workspaceId: string, reportId: string) =>
    apiClient.get<WorkspaceReport>(`/workspaces/${workspaceId}/reports/${reportId}`),

  generate: (workspaceId: string, payload: GenerateReportPayload = {}) =>
    apiClient.post<WorkspaceReport>(`/workspaces/${workspaceId}/reports/generate`, payload),
};
