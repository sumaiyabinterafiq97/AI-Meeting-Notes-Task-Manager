import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';

export function useTask(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(workspaceId ?? '', taskId ?? ''),
    queryFn: async () => {
      const { data } = await taskApi.getById(workspaceId!, taskId!);
      return data;
    },
    enabled: Boolean(workspaceId && taskId),
  });
}
