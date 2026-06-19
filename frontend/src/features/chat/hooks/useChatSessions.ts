import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../services/chat-api';
import { chatKeys } from './chat-keys';

export function useChatSessions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.sessions(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await chatApi.listWorkspaceSessions(workspaceId!);
      return data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
