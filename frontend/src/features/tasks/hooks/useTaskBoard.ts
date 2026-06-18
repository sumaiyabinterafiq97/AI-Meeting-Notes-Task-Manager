import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../services/task-api';
import { taskKeys } from './task-keys';
import type { TaskBoardFilters } from '../types/task.types';

export function useTaskBoard(workspaceId: string | undefined, filters: TaskBoardFilters = {}) {
  return useQuery({
    queryKey: taskKeys.board(workspaceId ?? '', filters),
    queryFn: async () => {
      const { data } = await taskApi.getBoard(workspaceId!, filters);
      return data;
    },
    enabled: Boolean(workspaceId),
  });
}
