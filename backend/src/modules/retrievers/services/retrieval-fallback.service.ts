import { vectorService } from '../../vector/services/vector.service';
import type { DocumentChunk } from '../../vector/types/vector.types';
import type { RetrievalFilters } from '../types/retriever.types';

export type FallbackRetrievalMode = 'hybrid' | 'semantic' | 'keyword' | 'keyword_only';

/**
 * Graceful degradation when vector search fails — FTS-only fallback.
 * @see docs/retrieval-flow.md §11
 */
export class RetrievalFallbackService {
  async searchWithFallback(
    query: string,
    filters: RetrievalFilters,
    mode: FallbackRetrievalMode,
    topK: number,
  ): Promise<{ chunks: DocumentChunk[]; retrievalMode: FallbackRetrievalMode }> {
    try {
      if (mode === 'keyword' || mode === 'keyword_only') {
        const chunks = await vectorService.keywordOnlySearch({
          workspaceId: filters.workspaceId,
          query,
          mode: 'keyword',
          meetingId: filters.meetingId,
          sourceTypes: filters.sourceTypes as never,
          topK,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        return { chunks, retrievalMode: mode === 'keyword_only' ? 'keyword_only' : 'keyword' };
      }

      const chunks = await vectorService.hybridSearch({
        workspaceId: filters.workspaceId,
        query,
        mode,
        meetingId: filters.meetingId,
        sourceTypes: filters.sourceTypes as never,
        topK,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      return { chunks, retrievalMode: mode };
    } catch {
      const chunks = await vectorService.keywordOnlySearch({
        workspaceId: filters.workspaceId,
        query,
        mode: 'keyword',
        meetingId: filters.meetingId,
        sourceTypes: filters.sourceTypes as never,
        topK,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      return { chunks, retrievalMode: 'keyword_only' };
    }
  }
}

export const retrievalFallbackService = new RetrievalFallbackService();
