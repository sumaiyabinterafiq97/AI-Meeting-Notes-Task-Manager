import { TaskPriority, TaskStatus } from '@prisma/client';

export const MAX_TASKS_PER_WORKSPACE = 500;
export const DONE_BOARD_LIMIT = 50;

export interface CreateTaskDto {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: TaskPriority;
  meetingId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  position?: number;
}

export interface TaskListQuery {
  status?: TaskStatus;
  assigneeId?: string;
  priority?: TaskPriority;
  page?: string;
  limit?: string;
  search?: string;
}

export interface BoardQuery {
  assigneeId?: string;
  doneLimit?: string;
}

export interface CreateCommentDto {
  content: string;
}

export interface TaskDto {
  id: string;
  workspaceId: string;
  meetingId: string | null;
  actionItemId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: Date | null;
  position: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDetailDto extends TaskDto {
  meeting: { id: string; title: string } | null;
  assignee: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  commentsCount: number;
}

export interface CommentDto {
  id: string;
  taskId: string;
  content: string;
  author: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteTaskContext {
  userId: string;
  role: string;
}
