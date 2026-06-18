import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';
import type { CreateWorkspaceFormData } from '../schemas/workspace.schemas';

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceFormData) => workspaceApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}
