import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';
import type { CreateTaskFormData } from '../schemas/task.schemas';

export function useCreateTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskFormData) => taskApi.create(workspaceId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.board(workspaceId, {}) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists(workspaceId) });
    },
  });
}
