export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_MENTION'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'INVITATION'
  | 'MEETING_PROCESSED';

export interface Notification {
  id: string;
  type: NotificationType;
  payload: unknown;
  workspaceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListFilters {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationsListResponse {
  data: Notification[];
  meta: PaginationMeta;
}

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assignedById: string;
}

export interface TaskMentionPayload {
  taskId: string;
  taskTitle: string;
  commentId: string;
  authorId: string;
}

export interface MeetingProcessedPayload {
  meetingId: string;
  meetingTitle: string;
}

export interface NotificationPreferences {
  emailTaskAssigned: boolean;
  emailDueSoon: boolean;
  inAppMentions: boolean;
}

export type NotificationPreferenceKey = keyof NotificationPreferences;
