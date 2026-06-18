import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be at most 2000 characters')
    .optional()
    .or(z.literal('')),
});

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be at most 2000 characters')
    .optional()
    .or(z.literal('')),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceFormData = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
