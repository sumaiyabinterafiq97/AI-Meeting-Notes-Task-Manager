import { z } from 'zod';

export const sourceCitationSchema = z.object({
  index: z.number().int().positive(),
  chunkId: z.string().uuid(),
  sourceType: z.string().optional(),
  meetingId: z.string().uuid().optional(),
  meetingTitle: z.string().optional(),
  meetingDate: z.string().optional(),
  excerpt: z.string().max(200),
  similarityScore: z.number().min(0).max(1).optional(),
  timestamp: z.string().optional(),
  claimText: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

export const citationValidationInputSchema = z.object({
  content: z.string(),
  citations: z.array(sourceCitationSchema),
  contextBlockCount: z.number().int().min(0),
  emptyContext: z.boolean(),
});

export type SourceCitationInput = z.infer<typeof sourceCitationSchema>;
