import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => workspaceApi.acceptInvitation(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}
