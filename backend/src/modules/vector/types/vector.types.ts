export type DocumentSourceType =
  | 'transcript'
  | 'summary'
  | 'decision'
  | 'risk'
  | 'action_item'
  | 'knowledge';

export type SearchMode = 'semantic' | 'keyword' | 'hybrid';

export interface DocumentChunk {
  id: string;
  workspaceId: string;
  meetingId?: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
  similarity?: number;
}

export interface VectorSearchQuery {
  workspaceId: string;
  queryVector: number[];
  meetingId?: string;
  sourceTypes?: DocumentSourceType[];
  topK?: number;
  minSimilarity?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface HybridSearchQuery {
  workspaceId: string;
  query: string;
  mode: SearchMode;
  meetingId?: string;
  sourceTypes?: DocumentSourceType[];
  topK?: number;
  minSimilarity?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedSearchResult {
  items: DocumentChunk[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
