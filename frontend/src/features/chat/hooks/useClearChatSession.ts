import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../services/chat-api';
import { chatKeys } from './chat-keys';

export function useClearChatSession(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await chatApi.clearSession(workspaceId!, sessionId);
      return sessionId;
    },
    onSuccess: (sessionId) => {
      if (!workspaceId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: chatKeys.sessions(workspaceId) });
      queryClient.removeQueries({
        queryKey: chatKeys.sessionMessages(workspaceId, sessionId),
      });
    },
  });
}
