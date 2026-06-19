import type { RetrievalFilters, RetrievalResult } from '../types/retriever.types';
import { ragService } from '../../rag/services/rag.service';

/**
 * Retriever agent — hybrid search orchestration with caching.
 * @see docs/retrieval-flow.md
 */
export class RetrieverService {
  async retrieve(query: string, filters: RetrievalFilters): Promise<RetrievalResult> {
    const startedAt = Date.now();
    const result = await ragService.search({
      query,
      workspaceId: filters.workspaceId,
      meetingId: filters.meetingId,
      mode: 'hybrid',
      sourceTypes: filters.sourceTypes,
    });

    return {
      chunks: result.chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        meetingId: chunk.meetingId,
        sourceType: chunk.sourceType,
        similarity: chunk.similarity,
        metadata: chunk.metadata,
      })),
      cacheHit: result.cacheHit,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export const retrieverService = new RetrieverService();
