import { ROUTES } from '@/lib/constants';
import type {
  MeetingProcessedPayload,
  Notification,
  TaskAssignedPayload,
  TaskMentionPayload,
} from '../types/notification.types';

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  return payload as Record<string, unknown>;
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

export function formatNotificationMessage(notification: Notification): string {
  const record = asRecord(notification.payload);

  switch (notification.type) {
    case 'TASK_ASSIGNED': {
      const title = record ? getString(record, 'taskTitle') : undefined;
      return title ? `You were assigned to "${title}"` : 'You were assigned a new task';
    }
    case 'TASK_MENTION': {
      const title = record ? getString(record, 'taskTitle') : undefined;
      return title ? `You were mentioned on "${title}"` : 'You were mentioned in a task comment';
    }
    case 'TASK_DUE_SOON': {
      const title = record ? getString(record, 'taskTitle') : undefined;
      return title ? `"${title}" is due soon` : 'A task is due soon';
    }
    case 'TASK_OVERDUE': {
      const title = record ? getString(record, 'taskTitle') : undefined;
      return title ? `"${title}" is overdue` : 'A task is overdue';
    }
    case 'MEETING_PROCESSED': {
      const title = record ? getString(record, 'meetingTitle') : undefined;
      return title ? `AI processing completed for "${title}"` : 'Meeting AI processing completed';
    }
    case 'INVITATION':
      return 'You have a new workspace invitation';
    default:
      return 'You have a new notification';
  }
}

export function getNotificationLink(notification: Notification): string | null {
  if (!notification.workspaceId) return null;
  const record = asRecord(notification.payload);
  if (!record) return null;

  switch (notification.type) {
    case 'TASK_ASSIGNED':
    case 'TASK_MENTION':
    case 'TASK_DUE_SOON':
    case 'TASK_OVERDUE': {
      const taskId = getString(record, 'taskId');
      return taskId ? ROUTES.TASKS(notification.workspaceId, taskId) : ROUTES.TASKS(notification.workspaceId);
    }
    case 'MEETING_PROCESSED': {
      const meetingId = getString(record, 'meetingId');
      return meetingId
        ? ROUTES.MEETING_DETAIL(notification.workspaceId, meetingId)
        : ROUTES.MEETINGS(notification.workspaceId);
    }
    case 'INVITATION':
      return ROUTES.WORKSPACES;
    default:
      return null;
  }
}

export function isTaskPayload(payload: unknown): payload is TaskAssignedPayload | TaskMentionPayload {
  const record = asRecord(payload);
  return Boolean(record && getString(record, 'taskId'));
}

export function isMeetingPayload(payload: unknown): payload is MeetingProcessedPayload {
  const record = asRecord(payload);
  return Boolean(record && getString(record, 'meetingId'));
}
