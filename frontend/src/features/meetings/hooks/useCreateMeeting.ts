import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';
import type { CreateMeetingFormData } from '../schemas/meeting.schemas';

export function useCreateMeeting(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingFormData) => meetingApi.create(workspaceId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists(workspaceId) });
    },
  });
}
