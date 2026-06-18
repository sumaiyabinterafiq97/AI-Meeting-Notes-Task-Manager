import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';
import type { WorkspaceRole } from '../types/workspace.types';

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      workspaceApi.updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}
