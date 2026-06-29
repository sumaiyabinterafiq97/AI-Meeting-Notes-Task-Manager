import { z } from 'zod';

export const embeddingModelIdSchema = z.enum([
  'text-embedding-3-small',
  'text-embedding-3-large',
  'custom',
]);

export const embedMeetingParamsSchema = z.object({
  meetingId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const reindexWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  reason: z.enum(['model_upgrade', 'admin', 'corruption']).optional(),
});

export const embeddingRequestSchema = z.object({
  texts: z.array(z.string().min(1)).min(1).max(500),
  model: embeddingModelIdSchema.optional(),
  workspaceId: z.string().uuid().optional(),
});

export const embedEntityParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  sourceType: z.enum(['knowledge', 'transcript', 'summary', 'decision', 'risk', 'action_item']),
  sourceId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EmbedMeetingParams = z.infer<typeof embedMeetingParamsSchema>;
export type ReindexWorkspaceParams = z.infer<typeof reindexWorkspaceParamsSchema>;
export type EmbedEntityParams = z.infer<typeof embedEntityParamsSchema>;
