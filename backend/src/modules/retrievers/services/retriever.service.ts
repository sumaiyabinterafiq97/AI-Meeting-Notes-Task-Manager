import { hybridRetriever } from '../../rag/retrievers/hybrid.retriever';
import type { DocumentChunk } from '../../vector/types/vector.types';
import { SIMILARITY_THRESHOLDS } from '../../vector/lib/vector.constants';
import type { RetrievalResponseDto } from '../dto/retriever.dto';
import { retrieveQuerySchema } from '../schemas/retriever.schema';
import type {
  RetrievalFilters,
  RetrievalOptions,
  RetrievalResult,
  SpecializedRetrievalUseCase,
} from '../types/retriever.types';
import { rankingService } from './ranking.service';
import { retrievalFallbackService } from './retrieval-fallback.service';
import { sourceAttributionService } from './source-attribution.service';

const USE_CASE_SOURCE_TYPES: Record<SpecializedRetrievalUseCase, string[]> = {
  meetings: ['transcript', 'summary'],
  tasks: ['action_item'],
  decisions: ['decision'],
  risks: ['risk'],
  knowledge: ['knowledge'],
};

const USE_CASE_THRESHOLDS: Record<SpecializedRetrievalUseCase, number> = {
  meetings: SIMILARITY_THRESHOLDS.search,
  tasks: SIMILARITY_THRESHOLDS.search,
  decisions: SIMILARITY_THRESHOLDS.chat,
  risks: SIMILARITY_THRESHOLDS.chat,
  knowledge: SIMILARITY_THRESHOLDS.search,
};

function toRetrievedChunk(chunk: DocumentChunk): import('../types/retriever.types').RetrievedChunk {
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

function postProcess(
  chunks: import('../types/retriever.types').RetrievedChunk[],
  similarityMin: number,
  topK: number,
): import('../types/retriever.types').RetrievedChunk[] {
  return rankingService
    .rankBySimilarity(rankingService.applyThreshold(rankingService.deduplicateBySource(chunks), similarityMin))
    .slice(0, topK);
}

/**
 * Retriever module — hybrid search, specialized use cases, citations, fallbacks.
 * Independent from agents; consumed by RAG, chat, and search APIs.
 * @see docs/retrieval-flow.md
 */
export class RetrieverService {
  async retrieve(
    query: string,
    filters: RetrievalFilters,
    options?: RetrievalOptions,
  ): Promise<RetrievalResult> {
    retrieveQuerySchema.parse({ query, filters, options });
    const startedAt = Date.now();
    const topK = options?.topK ?? 10;
    const similarityMin = options?.similarityMin ?? SIMILARITY_THRESHOLDS.search;
    const mode = options?.mode ?? 'hybrid';

    try {
      const { chunks, cacheHit, retrievalMode } = await hybridRetriever.retrieve({
        query,
        workspaceId: filters.workspaceId,
        meetingId: filters.meetingId,
        mode,
        topK,
        similarityMin,
        sourceTypes: filters.sourceTypes,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        queryIntent: options?.queryIntent,
      });

      const processed = postProcess(chunks, similarityMin, topK);
      return this.buildResult(processed, cacheHit, retrievalMode, Date.now() - startedAt);
    } catch {
      const fallback = await retrievalFallbackService.searchWithFallback(
        query,
        filters,
        mode,
        topK,
      );
      const processed = postProcess(
        fallback.chunks.map(toRetrievedChunk),
        similarityMin,
        topK,
      );
      return this.buildResult(processed, false, fallback.retrievalMode, Date.now() - startedAt);
    }
  }

  async retrieveWithCitations(
    query: string,
    filters: RetrievalFilters,
    options?: RetrievalOptions,
  ): Promise<RetrievalResponseDto> {
    const result = await this.retrieve(query, filters, options);
    return {
      chunks: result.chunks,
      citations: sourceAttributionService.buildCitations(result.chunks),
      cacheHit: result.cacheHit,
      latencyMs: result.latencyMs,
      retrievalMode: result.retrievalMode ?? 'hybrid',
      avgSimilarity: result.avgSimilarity ?? 0,
    };
  }

  async retrieveDecisions(query: string, filters: RetrievalFilters, options?: RetrievalOptions) {
    return this.retrieve(query, { ...filters, sourceTypes: ['decision'] }, {
      ...options,
      similarityMin: options?.similarityMin ?? USE_CASE_THRESHOLDS.decisions,
      queryIntent: 'decision',
    });
  }

  async retrieveRisks(query: string, filters: RetrievalFilters, options?: RetrievalOptions) {
    return this.retrieve(query, { ...filters, sourceTypes: ['risk'] }, {
      ...options,
      similarityMin: options?.similarityMin ?? USE_CASE_THRESHOLDS.risks,
      queryIntent: 'risk',
    });
  }

  async retrieveKnowledge(query: string, filters: RetrievalFilters, options?: RetrievalOptions) {
    return this.retrieve(query, { ...filters, sourceTypes: ['knowledge'] }, {
      ...options,
      similarityMin: options?.similarityMin ?? USE_CASE_THRESHOLDS.knowledge,
    });
  }

  async retrieveMeetings(query: string, filters: RetrievalFilters, options?: RetrievalOptions) {
    return this.retrieve(query, { ...filters, sourceTypes: USE_CASE_SOURCE_TYPES.meetings }, options);
  }

  async retrieveTasks(query: string, filters: RetrievalFilters, options?: RetrievalOptions) {
    return this.retrieve(query, { ...filters, sourceTypes: USE_CASE_SOURCE_TYPES.tasks }, options);
  }

  private buildResult(
    chunks: import('../types/retriever.types').RetrievedChunk[],
    cacheHit: boolean,
    retrievalMode: RetrievalResult['retrievalMode'],
    latencyMs: number,
  ): RetrievalResult {
    const avgSimilarity =
      chunks.length > 0
        ? chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length
        : 0;

    return {
      chunks,
      cacheHit,
      latencyMs,
      retrievalMode,
      avgSimilarity,
    };
  }
}

export const retrieverService = new RetrieverService();
