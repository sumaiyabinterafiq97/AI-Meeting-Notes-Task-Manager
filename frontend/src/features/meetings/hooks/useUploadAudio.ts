import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';

export function useUploadAudio(workspaceId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => meetingApi.uploadAudio(workspaceId, meetingId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(workspaceId, meetingId) });
    },
  });
}

export function useRetryTranscription(workspaceId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => meetingApi.retryTranscription(workspaceId, meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(workspaceId, meetingId) });
    },
  });
}
