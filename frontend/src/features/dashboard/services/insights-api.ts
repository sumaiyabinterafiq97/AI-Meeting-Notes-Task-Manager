import { apiClient } from '@/lib/api-client';
import type { WorkspaceInsightsData } from '../types/dashboard.types';

export const insightsApi = {
  getWorkspace: (workspaceId: string) =>
    apiClient.get<WorkspaceInsightsData>(`/workspaces/${workspaceId}/insights`),
};
