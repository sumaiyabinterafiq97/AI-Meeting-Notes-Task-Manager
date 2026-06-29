import type { DocumentChunk, HybridSearchQuery } from '../types/vector.types';
import type {
  HybridFusionStrategy,
  HybridSearchResult,
  HybridSearchResultItem,
} from '../types/hybrid-search.types';
import { embeddingService } from '../../embeddings/services/embedding.service';
import { vectorRepository } from '../repositories/vector.repository';
import { filterValidatorService } from './filter-validator.service';
import { reciprocalRankFusion } from './rrf.service';
import {
  HYBRID_KEYWORD_WEIGHT,
  HYBRID_SEMANTIC_WEIGHT,
  RRF_K,
  SIMILARITY_THRESHOLDS,
} from '../lib/vector.constants';

function normalizeKeywordScores(chunks: DocumentChunk[]): Map<string, number> {
  const scores = new Map<string, number>();
  const maxScore = Math.max(...chunks.map((c) => c.similarity ?? 0), 1e-9);

  for (const chunk of chunks) {
    scores.set(chunk.id, (chunk.similarity ?? 0) / maxScore);
  }

  return scores;
}

function weightedFusion(
  semantic: DocumentChunk[],
  keyword: DocumentChunk[],
): HybridSearchResultItem[] {
  const semanticById = new Map(semantic.map((chunk) => [chunk.id, chunk]));
  const keywordById = new Map(keyword.map((chunk) => [chunk.id, chunk]));
  const normalizedKeyword = normalizeKeywordScores(keyword);
  const ids = new Set([...semanticById.keys(), ...keywordById.keys()]);

  const fused: HybridSearchResultItem[] = [];

  for (const id of ids) {
    const chunk = semanticById.get(id) ?? keywordById.get(id)!;
    const semanticScore = semanticById.get(id)?.similarity ?? 0;
    const keywordScore = normalizedKeyword.get(id) ?? 0;
    const fusedScore =
      HYBRID_SEMANTIC_WEIGHT * semanticScore + HYBRID_KEYWORD_WEIGHT * keywordScore;

    fused.push({
      ...chunk,
      similarity: fusedScore,
      scores: {
        semantic: semanticScore,
        keyword: keywordScore,
        fused: fusedScore,
      },
      fusionStrategy: 'weighted',
    });
  }

  return fused.sort((a, b) => b.scores.fused - a.scores.fused);
}

function rrfFusion(semantic: DocumentChunk[], keyword: DocumentChunk[]): HybridSearchResultItem[] {
  const fused = reciprocalRankFusion([semantic, keyword], (chunk) => chunk.id, RRF_K);

  return fused.map((entry) => ({
    ...entry.item,
    similarity: entry.score,
    scores: {
      semantic: semantic.find((c) => c.id === entry.item.id)?.similarity,
      keyword: keyword.find((c) => c.id === entry.item.id)?.similarity,
      fused: entry.score,
    },
    fusionStrategy: 'rrf' as HybridFusionStrategy,
  }));
}

/**
 * Hybrid search engine — semantic + keyword fusion with RRF or weighted scoring.
 * @see docs/rag-requirements.md §9
 */
export class HybridSearchService {
  async search(
    query: HybridSearchQuery,
    fusionStrategy: HybridFusionStrategy = 'rrf',
  ): Promise<HybridSearchResult> {
    const startedAt = Date.now();
    filterValidatorService.validate(query);
    const topK = query.topK ?? 20;
    const minSimilarity = query.minSimilarity ?? SIMILARITY_THRESHOLDS.search;

    if (query.mode === 'keyword') {
      const keyword = await vectorRepository.keywordSearch({ ...query, topK });
      return {
        items: keyword.map((chunk) => ({
          ...chunk,
          scores: { keyword: chunk.similarity, fused: chunk.similarity ?? 0 },
          fusionStrategy: 'keyword_only',
        })),
        fusionStrategy: 'keyword_only',
        semanticCount: 0,
        keywordCount: keyword.length,
        latencyMs: Date.now() - startedAt,
      };
    }

    if (query.mode === 'semantic') {
      const semantic = await this.semanticSearch({ ...query, minSimilarity });
      if (semantic.length > 0) {
        return {
          items: semantic.map((chunk) => ({
            ...chunk,
            scores: { semantic: chunk.similarity, fused: chunk.similarity ?? 0 },
            fusionStrategy: 'semantic_only',
          })),
          fusionStrategy: 'semantic_only',
          semanticCount: semantic.length,
          keywordCount: 0,
          latencyMs: Date.now() - startedAt,
        };
      }

      const keyword = await vectorRepository.keywordSearch({ ...query, topK });
      return {
        items: keyword.map((chunk) => ({
          ...chunk,
          scores: { keyword: chunk.similarity, fused: chunk.similarity ?? 0 },
          fusionStrategy: 'keyword_only',
        })),
        fusionStrategy: 'keyword_only',
        semanticCount: 0,
        keywordCount: keyword.length,
        latencyMs: Date.now() - startedAt,
      };
    }

    const fetchK = Math.max(topK, 50);
    const [semantic, keyword] = await Promise.all([
      this.semanticSearch({ ...query, topK: fetchK, minSimilarity }),
      vectorRepository.keywordSearch({ ...query, topK: fetchK }),
    ]);

    if (semantic.length === 0 && keyword.length > 0) {
      return {
        items: keyword.slice(0, topK).map((chunk) => ({
          ...chunk,
          scores: { keyword: chunk.similarity, fused: chunk.similarity ?? 0 },
          fusionStrategy: 'keyword_only',
        })),
        fusionStrategy: 'keyword_only',
        semanticCount: 0,
        keywordCount: keyword.length,
        latencyMs: Date.now() - startedAt,
      };
    }

    if (semantic.length === 0 && keyword.length === 0) {
      return {
        items: [],
        fusionStrategy,
        semanticCount: 0,
        keywordCount: 0,
        latencyMs: Date.now() - startedAt,
      };
    }

    const fused =
      fusionStrategy === 'weighted'
        ? weightedFusion(semantic, keyword)
        : rrfFusion(semantic, keyword);

    return {
      items: fused.slice(0, topK),
      fusionStrategy,
      semanticCount: semantic.length,
      keywordCount: keyword.length,
      latencyMs: Date.now() - startedAt,
    };
  }

  async semanticSearch(query: HybridSearchQuery): Promise<DocumentChunk[]> {
    try {
      const embedResult = await embeddingService.generateBatch(
        [query.query],
        query.workspaceId,
      );

      const queryVector = embedResult.embeddings[0] ?? [];
      if (queryVector.length === 0) {
        return [];
      }

      return vectorRepository.similaritySearch({
        workspaceId: query.workspaceId,
        queryVector,
        meetingId: query.meetingId,
        sourceTypes: query.sourceTypes,
        topK: query.topK ?? 20,
        minSimilarity: query.minSimilarity ?? SIMILARITY_THRESHOLDS.search,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    } catch {
      return [];
    }
  }

  toDocumentChunks(result: HybridSearchResult): DocumentChunk[] {
    return result.items.map(({ scores: _scores, fusionStrategy: _strategy, ...chunk }) => chunk);
  }
}

export const hybridSearchService = new HybridSearchService();
