import { describe, it, expect } from 'vitest';
import { formatActivityMessage, formatIsoWeek } from '@/features/dashboard/lib/activity';

describe('dashboard activity', () => {
  it('formats task completed activity', () => {
    const message = formatActivityMessage({
      id: '1',
      action: 'task.completed',
      actor: { displayName: 'Alex' },
      entityType: 'task',
      entityId: 'task-1',
      metadata: { title: 'Update docs' },
      createdAt: '2026-06-15T10:00:00.000Z',
    });

    expect(message).toBe('Alex completed "Update docs"');
  });

  it('formats ISO week labels', () => {
    expect(formatIsoWeek('2026-W24')).toBe('W24 2026');
  });
});
