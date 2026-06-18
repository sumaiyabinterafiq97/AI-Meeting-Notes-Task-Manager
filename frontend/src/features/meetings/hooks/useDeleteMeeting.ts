import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';

export function useDeleteMeeting(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingApi.delete(workspaceId, meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists(workspaceId) });
    },
  });
}
