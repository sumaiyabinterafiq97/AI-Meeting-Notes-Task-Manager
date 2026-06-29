import { env } from '../../../config/env';
import { vectorService } from '../../vector/services/vector.service';
import { filterValidatorService } from '../../vector/services/filter-validator.service';
import type { DocumentSourceType } from '../../vector/types/vector.types';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';
import { rankingService } from '../../retrievers/services/ranking.service';
import type { RAGQuery } from '../types/rag.types';
import { ragCacheService } from '../services/rag-cache.service';
import {
  ragObservabilityService,
  type RetrievalMode,
} from '../services/rag-observability.service';
import { scoreBoostReranker } from '../rerankers/score-boost.reranker';

function toRetrievedChunk(chunk: {
  id: string;
  content: string;
  meetingId?: string;
  sourceType: string;
  sourceId?: string;
  chunkIndex?: number;
  similarity?: number;
  metadata: Record<string, unknown>;
}): RetrievedChunk {
  return {
    id: chunk.id,
    content: chunk.content,
    meetingId: chunk.meetingId,
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    chunkIndex: chunk.chunkIndex,
    similarity: chunk.similarity ?? 0,
    metadata: chunk.metadata,
  };
}

export class HybridRetriever {
  async retrieve(
    query: RAGQuery,
  ): Promise<{ chunks: RetrievedChunk[]; cacheHit: boolean; retrievalMode: RetrievalMode }> {
    const startedAt = Date.now();
    const mode = query.mode ?? 'hybrid';
    const topK = query.topK ?? 10;
    const minSimilarity = query.similarityMin ?? 0.65;
    const filters = {
      workspaceId: query.workspaceId,
      meetingId: query.meetingId,
      mode,
      topK,
      sourceTypes: query.sourceTypes,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    };

    const cacheKey = ragCacheService.buildQueryHash(query.query, filters);
    const cached = await ragCacheService.getRetrieval<RetrievedChunk[]>(query.workspaceId, cacheKey);

    if (cached) {
      ragObservabilityService.recordRetrieval({
        workspaceId: query.workspaceId,
        queryHash: cacheKey,
        mode,
        retrievalMode: mode,
        cacheHit: true,
        chunkCount: cached.length,
        avgSimilarity: ragObservabilityService.summarizeSearchResult({
          chunks: cached.map((c) => ({ ...c, similarity: c.similarity })),
          cacheHit: true,
          latencyMs: Date.now() - startedAt,
        }),
        latencyMs: Date.now() - startedAt,
      });
      return { chunks: cached, cacheHit: true, retrievalMode: mode };
    }

    filterValidatorService.validate({
      workspaceId: query.workspaceId,
      query: query.query,
      mode,
      meetingId: query.meetingId,
      sourceTypes: query.sourceTypes as DocumentSourceType[] | undefined,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    let retrievalMode: RetrievalMode = mode;
    let results;

    try {
      results = await vectorService.hybridSearch({
        workspaceId: query.workspaceId,
        query: query.query,
        mode,
        meetingId: query.meetingId,
        sourceTypes: query.sourceTypes as DocumentSourceType[] | undefined,
        topK: env.RERANKER_ENABLED ? Math.max(topK, 50) : Math.max(topK, 20),
        minSimilarity,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    } catch {
      retrievalMode = 'keyword_only';
      results = await vectorService.keywordOnlySearch({
        workspaceId: query.workspaceId,
        query: query.query,
        mode: 'keyword',
        meetingId: query.meetingId,
        sourceTypes: query.sourceTypes as DocumentSourceType[] | undefined,
        topK,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    }

    let chunks = results.map(toRetrievedChunk);

    // Cosine similarity thresholds apply only to semantic scores. RRF/keyword fused
    // scores use a different scale (~0.01–0.05) and must not be filtered here.
    const applyCosineThreshold =
      mode === 'semantic' || (retrievalMode === 'semantic' && mode !== 'hybrid');
    if (applyCosineThreshold) {
      chunks = rankingService.applyThreshold(chunks, minSimilarity);
    }

    chunks = rankingService.deduplicateBySource(chunks);

    if (env.RERANKER_ENABLED || query.queryIntent === 'decision' || query.queryIntent === 'risk') {
      chunks = scoreBoostReranker.rerank(chunks, query.query, topK);
    } else {
      chunks = rankingService.rankBySimilarity(chunks).slice(0, topK);
    }

    await ragCacheService.setRetrieval(
      query.workspaceId,
      cacheKey,
      chunks,
    );

    ragObservabilityService.recordRetrieval({
      workspaceId: query.workspaceId,
      queryHash: cacheKey,
      mode,
      retrievalMode,
      cacheHit: false,
      chunkCount: chunks.length,
      avgSimilarity:
        chunks.length > 0
          ? chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
          : 0,
      latencyMs: Date.now() - startedAt,
    });

    return { chunks, cacheHit: false, retrievalMode };
  }
}

export const hybridRetriever = new HybridRetriever();
