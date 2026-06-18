import { z } from 'zod';

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const statusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: prioritySchema.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300, 'Title is too long').optional(),
  description: z.string().max(5000, 'Description is too long').nullable().optional(),
  status: statusSchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: prioritySchema.optional(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment is too long'),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
export type CreateCommentFormData = z.infer<typeof createCommentSchema>;

export function toCreateTaskPayload(data: CreateTaskFormData) {
  return {
    title: data.title,
    ...(data.description?.trim() && { description: data.description.trim() }),
    ...(data.assigneeId && { assigneeId: data.assigneeId }),
    ...(data.dueDate && { dueDate: toDueDateIso(data.dueDate) }),
    ...(data.priority && { priority: data.priority }),
  };
}

export function toUpdateTaskPayload(data: UpdateTaskFormData) {
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.assigneeId !== undefined) payload.assigneeId = data.assigneeId || null;
  if (data.dueDate !== undefined) {
    payload.dueDate = data.dueDate ? toDueDateIso(data.dueDate) : null;
  }
  if (data.priority !== undefined) payload.priority = data.priority;

  return payload;
}

function toDueDateIso(value: string): string {
  if (value.includes('T')) {
    return new Date(value).toISOString();
  }
  return new Date(`${value}T00:00:00`).toISOString();
}
