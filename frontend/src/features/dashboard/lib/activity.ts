import type { DashboardActivity } from '../types/dashboard.types';

function getMetadataTitle(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const title = (metadata as { title?: unknown }).title;
  return typeof title === 'string' ? title : undefined;
}

export function formatActivityMessage(activity: DashboardActivity): string {
  const title = getMetadataTitle(activity.metadata);
  const actor = activity.actor.displayName;

  switch (activity.action) {
    case 'meeting.created':
      return `${actor} created meeting "${title ?? 'Untitled'}"`;
    case 'task.created':
      return `${actor} created task "${title ?? 'Untitled'}"`;
    case 'task.completed':
      return `${actor} completed "${title ?? 'a task'}"`;
    case 'task.status_changed':
      return `${actor} updated status for "${title ?? 'a task'}"`;
    case 'task.deleted':
      return `${actor} deleted a task`;
    default:
      return `${actor} performed ${activity.action.replace('.', ' ')}`;
  }
}

export function formatIsoWeek(week: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) return week;
  return `W${match[2]} ${match[1]}`;
}
