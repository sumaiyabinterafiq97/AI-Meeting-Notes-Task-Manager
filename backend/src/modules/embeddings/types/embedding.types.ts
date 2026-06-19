export type EmbeddingModelId = 'text-embedding-3-small' | 'text-embedding-3-large' | 'custom';

export interface EmbeddingRequest {
  texts: string[];
  model?: EmbeddingModelId;
  workspaceId?: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
  totalTokens: number;
}

export interface BatchEmbeddingJob {
  id: string;
  workspaceId: string;
  meetingId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunksTotal: number;
  chunksProcessed: number;
}
