import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';

export function useDeleteTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.delete(workspaceId, taskId),
    onSuccess: (_data, taskId) => {
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'board', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists(workspaceId) });
      void queryClient.removeQueries({ queryKey: taskKeys.detail(workspaceId, taskId) });
    },
  });
}
