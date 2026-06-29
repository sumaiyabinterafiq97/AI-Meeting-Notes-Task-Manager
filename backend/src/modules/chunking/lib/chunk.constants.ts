import type { ChunkSourceType, ChunkingStrategyName } from '../types/chunk.types';

/** Per-source chunk parameters — @see docs/rag-requirements.md §3.2 */
export const CHUNK_DEFAULTS: Record<
  ChunkSourceType,
  { strategy: ChunkingStrategyName; targetTokens: number; overlapTokens: number }
> = {
  transcript: { strategy: 'recursive', targetTokens: 512, overlapTokens: 64 },
  summary: { strategy: 'single', targetTokens: 256, overlapTokens: 0 },
  decision: { strategy: 'single', targetTokens: 128, overlapTokens: 0 },
  risk: { strategy: 'single', targetTokens: 128, overlapTokens: 0 },
  action_item: { strategy: 'single', targetTokens: 128, overlapTokens: 0 },
  task: { strategy: 'fixed', targetTokens: 256, overlapTokens: 32 },
  knowledge: { strategy: 'semantic', targetTokens: 256, overlapTokens: 32 },
};

export function resolveChunkDefaults(sourceType: ChunkSourceType): {
  strategy: ChunkingStrategyName;
  targetTokens: number;
  overlapTokens: number;
} {
  return CHUNK_DEFAULTS[sourceType] ?? CHUNK_DEFAULTS.knowledge;
}
