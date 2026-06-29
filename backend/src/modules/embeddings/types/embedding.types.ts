export type EmbeddingProviderId = 'openai' | 'gemini' | 'local' | 'voyage';

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
  cacheHits?: number;
  cacheMisses?: number;
  retries?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface StoredChunkEmbedding {
  contentHash?: string;
  embedding: number[];
  embeddingModel: string;
}

export interface BatchEmbeddingJob {
  id: string;
  workspaceId: string;
  meetingId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  chunksTotal: number;
  chunksProcessed: number;
  errorMessage?: string;
}

export interface EmbedEntityInput {
  workspaceId: string;
  sourceType: 'knowledge' | 'transcript' | 'summary' | 'decision' | 'risk' | 'action_item';
  sourceId: string;
  meetingId?: string;
  content: string;
  metadata?: Record<string, unknown>;
}
