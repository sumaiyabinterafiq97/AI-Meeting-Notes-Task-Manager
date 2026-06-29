import { z } from 'zod';

export const hybridFusionStrategySchema = z.enum(['rrf', 'weighted']);

export const hybridSearchRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().min(1),
  mode: z.enum(['semantic', 'keyword', 'hybrid']).default('hybrid'),
  fusionStrategy: hybridFusionStrategySchema.optional(),
  meetingId: z.string().uuid().optional(),
  sourceTypes: z.array(z.string()).optional(),
  topK: z.number().int().positive().max(100).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type HybridSearchRequestInput = z.infer<typeof hybridSearchRequestSchema>;
