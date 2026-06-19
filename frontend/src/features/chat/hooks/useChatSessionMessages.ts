import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../services/chat-api';
import { chatKeys } from './chat-keys';

export function useChatSessionMessages(
  workspaceId: string | undefined,
  sessionId: string | undefined,
) {
  return useQuery({
    queryKey: chatKeys.sessionMessages(workspaceId ?? '', sessionId ?? ''),
    queryFn: async () => {
      const { data } = await chatApi.getSessionMessages(workspaceId!, sessionId!);
      return data.data;
    },
    enabled: Boolean(workspaceId && sessionId),
  });
}
