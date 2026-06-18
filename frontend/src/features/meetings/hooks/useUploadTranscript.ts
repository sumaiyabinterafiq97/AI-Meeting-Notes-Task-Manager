import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';
import type { TranscriptSourceFormat } from '../types/meeting.types';

export function useUploadTranscript(workspaceId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      content,
      sourceFormat,
    }: {
      content: string;
      sourceFormat: TranscriptSourceFormat;
    }) => meetingApi.uploadTranscript(workspaceId, meetingId, content, sourceFormat),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(workspaceId, meetingId) });
    },
  });
}
