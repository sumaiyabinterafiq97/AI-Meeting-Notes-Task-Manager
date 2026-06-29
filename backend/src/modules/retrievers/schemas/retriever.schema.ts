import { z } from 'zod';

export const retrievalFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  sourceTypes: z.array(z.string()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  severity: z.string().optional(),
});

export const retrievalOptionsSchema = z.object({
  topK: z.number().int().min(1).max(50).default(10),
  similarityMin: z.number().min(0).max(1).default(0.65),
  mode: z.enum(['hybrid', 'semantic', 'keyword']).default('hybrid'),
  queryIntent: z.string().optional(),
});

export const retrieveQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  filters: retrievalFiltersSchema,
  options: retrievalOptionsSchema.optional(),
});
