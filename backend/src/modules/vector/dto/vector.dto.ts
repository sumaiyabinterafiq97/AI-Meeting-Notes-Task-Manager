import type { DocumentChunk, DocumentSourceType } from '../types/vector.types';

export interface VectorSearchHitDto {
  id: string;
  content: string;
  meetingId?: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  chunkIndex: number;
  similarity: number;
  excerpt: string;
  metadata: Record<string, unknown>;
}

export interface PaginatedVectorSearchResultDto {
  results: VectorSearchHitDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  searchMode: 'semantic' | 'keyword' | 'hybrid' | 'keyword_only';
}

export interface VectorStorageStatsDto {
  workspaceId: string;
  totalChunks: number;
  embeddedChunks: number;
  bySourceType: Record<string, number>;
}

export function toSearchHit(chunk: DocumentChunk): VectorSearchHitDto {
  return {
    id: chunk.id,
    content: chunk.content,
    meetingId: chunk.meetingId,
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    chunkIndex: chunk.chunkIndex,
    similarity: chunk.similarity ?? 0,
    excerpt: chunk.content.slice(0, 200),
    metadata: chunk.metadata,
  };
}
