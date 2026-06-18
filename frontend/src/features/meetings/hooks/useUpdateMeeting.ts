import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';
import type { UpdateMeetingFormData } from '../schemas/meeting.schemas';

export function useUpdateMeeting(workspaceId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMeetingFormData) => meetingApi.update(workspaceId, meetingId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(workspaceId, meetingId) });
    },
  });
}
