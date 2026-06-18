import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  toCreateTaskPayload,
  toUpdateTaskPayload,
} from '@/features/tasks/schemas/task.schemas';

describe('task.schemas', () => {
  it('validates create task form', () => {
    const result = createTaskSchema.safeParse({
      title: 'Review API docs',
      description: 'Check endpoints',
      priority: 'HIGH',
    });

    expect(result.success).toBe(true);
  });

  it('builds create payload without empty optional fields', () => {
    const payload = toCreateTaskPayload({
      title: 'Ship feature',
      description: '',
      assigneeId: '',
      dueDate: '',
      priority: 'MEDIUM',
    });

    expect(payload).toEqual({
      title: 'Ship feature',
      priority: 'MEDIUM',
    });
  });

  it('maps cleared assignee to null on update', () => {
    const payload = toUpdateTaskPayload({
      assigneeId: '',
    });

    expect(payload.assigneeId).toBeNull();
  });
});
