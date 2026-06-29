import { z } from 'zod';

export const documentSourceTypeSchema = z.enum([
  'transcript',
  'summary',
  'decision',
  'risk',
  'action_item',
  'knowledge',
]);

export const searchModeSchema = z.enum(['semantic', 'keyword', 'hybrid']);

export const vectorSearchQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().min(1).max(2000),
  mode: searchModeSchema.default('hybrid'),
  meetingId: z.string().uuid().optional(),
  sourceTypes: z.array(documentSourceTypeSchema).optional(),
  topK: z.number().int().min(1).max(100).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const storedChunkSchema = z.object({
  workspaceId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  sourceType: documentSourceTypeSchema,
  sourceId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  content: z.string().min(1),
  tokenCount: z.number().int().min(0),
  embedding: z.array(z.number()).min(1),
  embeddingModel: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
