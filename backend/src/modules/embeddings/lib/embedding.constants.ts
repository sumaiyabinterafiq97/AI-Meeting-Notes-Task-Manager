import { env } from '../../../config/env';

/** Max texts per provider API call (FR-RAG-EMB-003). */
export const EMBEDDING_BATCH_SIZE = 100;

/** Default vector dimensions for text-embedding-3-small. */
export const EMBEDDING_DIMENSIONS = 1536;

export const DEFAULT_EMBEDDING_MODEL = env.EMBEDDING_MODEL;

/** Approximate USD cost per 1M tokens — text-embedding-3-small. */
export const EMBEDDING_COST_PER_MILLION_TOKENS = 0.02;

export function estimateEmbeddingCostUsd(totalTokens: number): number {
  return (totalTokens / 1_000_000) * EMBEDDING_COST_PER_MILLION_TOKENS;
}

export function chunkStorageKey(
  sourceType: string,
  sourceId: string,
  chunkIndex: number,
): string {
  return `${sourceType}:${sourceId}:${chunkIndex}`;
}
