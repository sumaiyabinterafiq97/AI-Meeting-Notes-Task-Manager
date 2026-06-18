import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';

export function useTaskComments(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.comments(workspaceId ?? '', taskId ?? ''),
    queryFn: async () => {
      const { data } = await taskApi.listComments(workspaceId!, taskId!);
      return data.data;
    },
    enabled: Boolean(workspaceId && taskId),
  });
}
