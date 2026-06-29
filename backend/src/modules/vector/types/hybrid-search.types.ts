import type { DocumentChunk } from './vector.types';

export type HybridFusionStrategy = 'rrf' | 'weighted' | 'semantic_only' | 'keyword_only';

export interface HybridSearchScores {
  semantic?: number;
  keyword?: number;
  fused: number;
}

export interface HybridSearchResultItem extends DocumentChunk {
  scores: HybridSearchScores;
  fusionStrategy: HybridFusionStrategy;
}

export interface HybridSearchResult {
  items: HybridSearchResultItem[];
  fusionStrategy: HybridFusionStrategy;
  semanticCount: number;
  keywordCount: number;
  latencyMs: number;
}

export type { DocumentChunk, HybridSearchQuery, SearchMode } from './vector.types';
