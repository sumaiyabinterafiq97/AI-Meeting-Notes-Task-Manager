export type RetrievalFilters = {
  workspaceId: string;
  meetingId?: string;
  sourceTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  assigneeId?: string;
  severity?: string;
};

export interface RetrievedChunk {
  id: string;
  content: string;
  meetingId?: string;
  sourceType: string;
  sourceId?: string;
  chunkIndex?: number;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalOptions {
  topK?: number;
  similarityMin?: number;
  mode?: 'hybrid' | 'semantic' | 'keyword';
  queryIntent?: string;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  cacheHit: boolean;
  latencyMs: number;
  retrievalMode?: 'hybrid' | 'semantic' | 'keyword' | 'keyword_only';
  avgSimilarity?: number;
}

export type SpecializedRetrievalUseCase =
  | 'meetings'
  | 'tasks'
  | 'decisions'
  | 'risks'
  | 'knowledge';
