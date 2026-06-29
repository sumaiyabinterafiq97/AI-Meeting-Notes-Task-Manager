import { z } from 'zod';
import type { RAGContextUseCase } from '../../types/rag.types';

export const contextUseCaseSchema = z.enum(['chat', 'meeting', 'weekly']);

export const contextBuildOptionsSchema = z.object({
  tokenBudget: z.number().int().positive().optional(),
  useCase: contextUseCaseSchema.optional(),
  compress: z.boolean().optional(),
});

export const contextBuildRequestSchema = z.object({
  chunks: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      similarity: z.number(),
      sourceType: z.string(),
      metadata: z.record(z.string(), z.unknown()).default({}),
    }),
  ),
  options: contextBuildOptionsSchema.optional(),
});

export type ContextBuildOptionsInput = z.infer<typeof contextBuildOptionsSchema>;
export type ContextUseCaseInput = RAGContextUseCase;
