import { describe, it, expect } from 'vitest';
import {
  formatNotificationMessage,
  getNotificationLink,
} from '@/features/notifications/lib/format-notification';
import type { Notification } from '@/features/notifications/types/notification.types';

const baseNotification: Notification = {
  id: 'n-1',
  type: 'TASK_ASSIGNED',
  payload: { taskId: 'task-1', taskTitle: 'Review API', assignedById: 'user-2' },
  workspaceId: 'ws-1',
  isRead: false,
  createdAt: '2026-06-15T10:00:00.000Z',
};

describe('format-notification', () => {
  it('formats task assigned message', () => {
    expect(formatNotificationMessage(baseNotification)).toBe(
      'You were assigned to "Review API"',
    );
  });

  it('links task notifications to task detail', () => {
    expect(getNotificationLink(baseNotification)).toBe('/workspaces/ws-1/tasks?taskId=task-1');
  });

  it('formats task mention message', () => {
    const notification: Notification = {
      ...baseNotification,
      type: 'TASK_MENTION',
      payload: { taskId: 'task-1', taskTitle: 'Docs', commentId: 'c-1', authorId: 'user-2' },
    };

    expect(formatNotificationMessage(notification)).toBe('You were mentioned on "Docs"');
  });
});
