import { NotificationType } from '@prisma/client';

export interface NotificationListQuery {
  unreadOnly?: string;
  page?: string;
  limit?: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payload: unknown;
  workspaceId: string | null;
  isRead: boolean;
  createdAt: Date;
}
