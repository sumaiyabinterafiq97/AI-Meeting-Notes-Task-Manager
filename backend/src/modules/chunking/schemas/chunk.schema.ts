import { z } from 'zod';

export const chunkSourceTypeSchema = z.enum([
  'transcript',
  'summary',
  'decision',
  'risk',
  'action_item',
  'task',
  'knowledge',
]);

export const chunkingStrategySchema = z.enum([
  'fixed',
  'recursive',
  'sliding',
  'semantic',
  'single',
  'transcript',
]);

export const chunkInputSchema = z.object({
  content: z.string().min(1),
  sourceType: chunkSourceTypeSchema,
  sourceId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const chunkingOptionsSchema = z.object({
  targetTokens: z.number().int().positive().max(8192).optional(),
  overlapTokens: z.number().int().min(0).max(1024).optional(),
  strategy: chunkingStrategySchema.optional(),
});

export const chunkBatchSchema = z.object({
  inputs: z.array(chunkInputSchema).min(1).max(500),
  options: chunkingOptionsSchema.optional(),
});
