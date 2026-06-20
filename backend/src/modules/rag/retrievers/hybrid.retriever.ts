import { env } from '../../../config/env';
import { vectorService } from '../../vector/services/vector.service';
import type { DocumentSourceType } from '../../vector/types/vector.types';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';
import type { RAGQuery } from '../types/rag.types';
import { ragCacheService } from '../services/rag-cache.service';
import { noopReranker } from '../rerankers/noop.reranker';

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
  async retrieve(query: RAGQuery): Promise<{ chunks: RetrievedChunk[]; cacheHit: boolean }> {
    const mode = query.mode ?? 'hybrid';
    const topK = query.topK ?? 10;
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
    const cached = await ragCacheService.get<RetrievedChunk[]>('rag:ret', [
      query.workspaceId,
      cacheKey,
    ]);

    if (cached) {
      return { chunks: cached, cacheHit: true };
    }

    const sourceTypes = query.sourceTypes as DocumentSourceType[] | undefined;

    const results = await vectorService.hybridSearch({
      workspaceId: query.workspaceId,
      query: query.query,
      mode,
      meetingId: query.meetingId,
      sourceTypes,
      topK: env.RERANKER_ENABLED ? Math.max(topK, 50) : topK,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    let chunks = results.map(toRetrievedChunk);

    if (env.RERANKER_ENABLED) {
      chunks = await noopReranker.rerank(chunks, query.query, topK);
    }

    await ragCacheService.set(
      'rag:ret',
      [query.workspaceId, cacheKey],
      chunks,
      env.RAG_RETRIEVAL_CACHE_TTL_SECONDS,
    );

    return { chunks, cacheHit: false };
  }
}

export const hybridRetriever = new HybridRetriever();
