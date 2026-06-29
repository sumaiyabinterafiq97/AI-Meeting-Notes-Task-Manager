import type { RAGQuery, RAGSearchResult } from '../types/rag.types';
import { vectorService } from '../../vector/services/vector.service';

/**
 * Graceful degradation when vector search is unavailable.
 */
export class RAGFallbackService {
  async keywordFallback(query: RAGQuery): Promise<RAGSearchResult> {
    const startedAt = Date.now();
    const topK = query.topK ?? 10;

    const chunks = await vectorService.keywordOnlySearch({
      workspaceId: query.workspaceId,
      query: query.query,
      mode: 'keyword',
      meetingId: query.meetingId,
      sourceTypes: query.sourceTypes as import('../../vector/types/vector.types').DocumentSourceType[] | undefined,
      topK,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return {
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        meetingId: chunk.meetingId,
        sourceType: chunk.sourceType,
        similarity: chunk.similarity ?? 0,
        metadata: chunk.metadata,
      })),
      cacheHit: false,
      retrievalMode: 'keyword_only',
      latencyMs: Date.now() - startedAt,
    };
  }
}

export const ragFallbackService = new RAGFallbackService();
