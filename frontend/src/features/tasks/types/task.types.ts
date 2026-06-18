export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
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
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignee {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface TaskMeetingLink {
  id: string;
  title: string;
}

export interface TaskDetail extends Task {
  meeting: TaskMeetingLink | null;
  assignee: TaskAssignee | null;
  commentsCount: number;
}

export interface TaskBoard {
  TODO: Task[];
  IN_PROGRESS: Task[];
  DONE: Task[];
}

export interface TaskBoardFilters {
  assigneeId?: string;
  doneLimit?: number;
}

export interface TaskListFilters {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  assigneeId?: string;
  priority?: TaskPriority;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TasksListResponse {
  data: Task[];
  meta: PaginationMeta;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  author: TaskAssignee;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsListResponse {
  data: TaskComment[];
}

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
