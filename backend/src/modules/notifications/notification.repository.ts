import { NotificationType, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { PaginationParams } from '../../lib/pagination';

const taskUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
} as const;

export class NotificationRepository {
  async create(data: {
    userId: string;
    workspaceId: string;
    type: NotificationType;
    payload: Prisma.InputJsonValue;
  }) {
    return prisma.notification.create({ data });
  }

  async createMany(
    items: Array<{
      userId: string;
      workspaceId: string;
      type: NotificationType;
      payload: Prisma.InputJsonValue;
    }>,
  ) {
    if (items.length === 0) {
      return { count: 0 };
    }

    return prisma.notification.createMany({ data: items });
  }

  async listForUser(
    userId: string,
    pagination: PaginationParams,
    unreadOnly: boolean,
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  async findByIdForUser(notificationId: string, userId: string) {
    return prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
  }

  async markRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export const notificationRepository = new NotificationRepository();
