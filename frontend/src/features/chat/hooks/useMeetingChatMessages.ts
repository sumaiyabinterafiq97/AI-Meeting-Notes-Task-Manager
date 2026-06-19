import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../services/chat-api';
import { chatKeys } from './chat-keys';

export function useMeetingChatMessages(workspaceId: string | undefined, meetingId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.meetingMessages(workspaceId ?? '', meetingId ?? ''),
    queryFn: async () => {
      const { data } = await chatApi.getMeetingMessages(workspaceId!, meetingId!);
      return data.data;
    },
    enabled: Boolean(workspaceId && meetingId),
  });
}
