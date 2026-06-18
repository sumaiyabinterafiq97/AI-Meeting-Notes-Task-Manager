import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => workspaceApi.removeMember(workspaceId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}
