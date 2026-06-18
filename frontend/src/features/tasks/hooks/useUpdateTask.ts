import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';
import type { UpdateTaskFormData } from '../schemas/task.schemas';

export function useUpdateTask(workspaceId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskFormData) => taskApi.update(workspaceId, taskId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'board', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(workspaceId, taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists(workspaceId) });
    },
  });
}
