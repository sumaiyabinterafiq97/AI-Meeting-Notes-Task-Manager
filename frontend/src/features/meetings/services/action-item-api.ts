import { apiClient } from '@/lib/api-client';
import type { ActionItem, TaskFromActionItem } from '../types/meeting.types';

export const actionItemApi = {
  list: (workspaceId: string, meetingId: string) =>
    apiClient.get<{ data: ActionItem[] }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/action-items`,
    ),

  accept: (workspaceId: string, meetingId: string, actionItemIds: string[]) =>
    apiClient.post<{ tasks: TaskFromActionItem[] }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/action-items/accept`,
      { actionItemIds },
    ),

  reject: (workspaceId: string, meetingId: string, actionItemIds: string[]) =>
    apiClient.post<{ rejected: number }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/action-items/reject`,
      { actionItemIds },
    ),
};
