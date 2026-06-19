export type RetrievalFilters = {
  workspaceId: string;
  meetingId?: string;
  sourceTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
};

export interface RetrievedChunk {
  id: string;
  content: string;
  meetingId?: string;
  sourceType: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  cacheHit: boolean;
  latencyMs: number;
}
