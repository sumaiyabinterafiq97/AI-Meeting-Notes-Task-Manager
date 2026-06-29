import { z } from 'zod';
import { contextUseCaseSchema } from '../context-builders/schemas/context.schema';

export const ragSearchModeSchema = z.enum(['semantic', 'keyword', 'hybrid']);

export const ragQuerySchema = z.object({
  query: z.string().min(1),
  workspaceId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  mode: ragSearchModeSchema.optional(),
  topK: z.number().int().positive().max(100).optional(),
  similarityMin: z.number().min(0).max(1).optional(),
  sourceTypes: z.array(z.string()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  queryIntent: z.string().optional(),
});

export const ragPipelineOptionsSchema = z.object({
  promptId: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  useCase: contextUseCaseSchema.optional(),
  tokenBudget: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(3).optional(),
});

export type RAGQueryInput = z.infer<typeof ragQuerySchema>;
export type RAGPipelineOptionsInput = z.infer<typeof ragPipelineOptionsSchema>;
