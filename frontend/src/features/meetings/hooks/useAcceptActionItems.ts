import { useMutation, useQueryClient } from '@tanstack/react-query';
import { actionItemApi } from '../services/action-item-api';
import { meetingKeys } from './meeting-keys';

export function useAcceptActionItems(workspaceId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionItemIds: string[]) =>
      actionItemApi.accept(workspaceId, meetingId, actionItemIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(workspaceId, meetingId) });
    },
  });
}
