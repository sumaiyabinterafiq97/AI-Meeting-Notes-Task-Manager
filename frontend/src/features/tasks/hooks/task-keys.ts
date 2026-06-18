import type { TaskBoardFilters } from '../types/task.types';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: (workspaceId: string) => [...taskKeys.all, 'list', workspaceId] as const,
  board: (workspaceId: string, filters: TaskBoardFilters) =>
    [...taskKeys.all, 'board', workspaceId, filters] as const,
  detail: (workspaceId: string, taskId: string) =>
    [...taskKeys.all, 'detail', workspaceId, taskId] as const,
  comments: (workspaceId: string, taskId: string) =>
    [...taskKeys.all, 'comments', workspaceId, taskId] as const,
};
