import { apiClient } from '@/lib/api-client';
import type {
  CommentsListResponse,
  Task,
  TaskBoard,
  TaskBoardFilters,
  TaskComment,
  TaskDetail,
  TaskListFilters,
  TasksListResponse,
} from '../types/task.types';
import type { CreateTaskFormData, UpdateTaskFormData } from '../schemas/task.schemas';
import { toCreateTaskPayload, toUpdateTaskPayload } from '../schemas/task.schemas';

export const taskApi = {
  list: (workspaceId: string, filters: TaskListFilters = {}) =>
    apiClient.get<TasksListResponse>(`/workspaces/${workspaceId}/tasks`, { params: filters }),

  getBoard: (workspaceId: string, filters: TaskBoardFilters = {}) =>
    apiClient.get<TaskBoard>(`/workspaces/${workspaceId}/tasks/board`, { params: filters }),

  getById: (workspaceId: string, taskId: string) =>
    apiClient.get<TaskDetail>(`/workspaces/${workspaceId}/tasks/${taskId}`),

  create: (workspaceId: string, data: CreateTaskFormData) =>
    apiClient.post<Task>(`/workspaces/${workspaceId}/tasks`, toCreateTaskPayload(data)),

  update: (workspaceId: string, taskId: string, data: UpdateTaskFormData) =>
    apiClient.patch<Task>(
      `/workspaces/${workspaceId}/tasks/${taskId}`,
      toUpdateTaskPayload(data),
    ),

  delete: (workspaceId: string, taskId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/tasks/${taskId}`),

  listComments: (workspaceId: string, taskId: string) =>
    apiClient.get<CommentsListResponse>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`),

  createComment: (workspaceId: string, taskId: string, content: string) =>
    apiClient.post<TaskComment>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
      content,
    }),
};
