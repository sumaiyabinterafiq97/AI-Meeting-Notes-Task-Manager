import { NotificationType } from '@prisma/client';
import { parsePagination, buildPaginationMeta } from '../../lib/pagination';
import { AppError, ErrorCodes } from '../../utils/errors';
import { notificationRepository } from './notification.repository';

export class NotificationService {
  async notifyTaskAssigned(data: {
    assigneeId: string;
    workspaceId: string;
    taskId: string;
    taskTitle: string;
    assignedById: string;
  }) {
    if (data.assigneeId === data.assignedById) {
      return;
    }

    await notificationRepository.create({
      userId: data.assigneeId,
      workspaceId: data.workspaceId,
      type: NotificationType.TASK_ASSIGNED,
      payload: {
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        assignedById: data.assignedById,
      },
    });
  }

  async notifyTaskMentions(data: {
    mentionedUserIds: string[];
    workspaceId: string;
    taskId: string;
    taskTitle: string;
    commentId: string;
    authorId: string;
  }) {
    const recipients = data.mentionedUserIds.filter((id) => id !== data.authorId);
    if (recipients.length === 0) {
      return;
    }

    await notificationRepository.createMany(
      recipients.map((userId) => ({
        userId,
        workspaceId: data.workspaceId,
        type: NotificationType.TASK_MENTION,
        payload: {
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          commentId: data.commentId,
          authorId: data.authorId,
        },
      })),
    );
  }

  async listNotifications(
    userId: string,
    query: { unreadOnly?: string; page?: string; limit?: string },
  ) {
    const pagination = parsePagination(query);
    const unreadOnly = query.unreadOnly === 'true';

    const { items, total } = await notificationRepository.listForUser(
      userId,
      pagination,
      unreadOnly,
    );

    return {
      data: items.map((item) => ({
        id: item.id,
        type: item.type,
        payload: item.payload,
        workspaceId: item.workspaceId,
        isRead: item.isRead,
        createdAt: item.createdAt,
      })),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const notification = await notificationRepository.findByIdForUser(notificationId, userId);
    if (!notification) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Notification not found');
    }

    if (!notification.isRead) {
      await notificationRepository.markRead(notificationId, userId);
    }

    return { id: notificationId, isRead: true };
  }

  async markAllNotificationsRead(userId: string) {
    const result = await notificationRepository.markAllRead(userId);
    return { markedRead: result.count };
  }
}

export const notificationService = new NotificationService();
