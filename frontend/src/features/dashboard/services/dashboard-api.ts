import { apiClient } from '@/lib/api-client';
import type { DashboardData } from '../types/dashboard.types';

export const dashboardApi = {
  get: (workspaceId: string) =>
    apiClient.get<DashboardData>(`/workspaces/${workspaceId}/dashboard`),
};
