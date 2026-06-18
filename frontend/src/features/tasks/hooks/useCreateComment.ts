import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';

export function useCreateComment(workspaceId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => taskApi.createComment(workspaceId, taskId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.comments(workspaceId, taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(workspaceId, taskId) });
    },
  });
}
