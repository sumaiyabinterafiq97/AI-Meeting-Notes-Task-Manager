import type { DocumentSourceType } from '../../vector/types/vector.types';
import { vectorRepository } from '../../vector/repositories/vector.repository';
import { vectorService } from '../../vector/services/vector.service';
import type { RAGQuery, RAGSearchResult } from '../types/rag.types';

/** Intents that may load the full meeting corpus when hybrid/keyword retrieval is empty. */
export const MEETING_CORPUS_FALLBACK_INTENTS = new Set(['synthesis', 'general', 'meeting_query']);

const CORPUS_PREFERRED_SOURCE_TYPES: DocumentSourceType[] = [
  'summary',
  'transcript',
  'decision',
  'risk',
  'knowledge',
  'action_item',
];

/**
 * Graceful degradation when vector search is unavailable or empty for meeting chat.
 */
export class RAGFallbackService {
  shouldUseMeetingCorpusFallback(query: RAGQuery): boolean {
    return Boolean(query.meetingId) && MEETING_CORPUS_FALLBACK_INTENTS.has(query.queryIntent ?? '');
  }

  async keywordFallback(query: RAGQuery): Promise<RAGSearchResult> {
    const startedAt = Date.now();
    const topK = query.topK ?? 10;

    const chunks = await vectorService.keywordOnlySearch({
      workspaceId: query.workspaceId,
      query: query.query,
      mode: 'keyword',
      meetingId: query.meetingId,
      sourceTypes: query.sourceTypes as DocumentSourceType[] | undefined,
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

  /**
   * Meeting-scoped corpus load when retrieval returns nothing for summarize/overview-style intents.
   * Prefer summary → transcript; does not invent content when the meeting has no chunks.
   */
  async meetingCorpusFallback(query: RAGQuery): Promise<RAGSearchResult> {
    const startedAt = Date.now();
    const meetingId = query.meetingId;
    if (!meetingId || !this.shouldUseMeetingCorpusFallback(query)) {
      return {
        chunks: [],
        cacheHit: false,
        retrievalMode: 'keyword_only',
        latencyMs: Date.now() - startedAt,
      };
    }

    const topK = query.topK ?? 12;
    const preferred =
      query.sourceTypes && query.sourceTypes.length > 0
        ? (query.sourceTypes as DocumentSourceType[])
        : CORPUS_PREFERRED_SOURCE_TYPES;

    const chunks = await vectorRepository.listByMeeting(meetingId, query.workspaceId, {
      topK,
      sourceTypes: preferred,
    });

    return {
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        meetingId: chunk.meetingId,
        sourceType: chunk.sourceType,
        similarity: chunk.similarity ?? 1,
        metadata: chunk.metadata,
      })),
      cacheHit: false,
      retrievalMode: 'keyword_only',
      latencyMs: Date.now() - startedAt,
    };
  }
}

export const ragFallbackService = new RAGFallbackService();
