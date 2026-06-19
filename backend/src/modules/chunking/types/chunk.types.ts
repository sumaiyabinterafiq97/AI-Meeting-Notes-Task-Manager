export type ChunkSourceType = 'transcript' | 'summary' | 'decision' | 'action_item' | 'knowledge';

export interface ChunkInput {
  content: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  meetingId?: string;
  metadata?: Record<string, unknown>;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  sourceType: ChunkSourceType;
  sourceId: string;
  metadata: Record<string, unknown>;
}

export interface ChunkingOptions {
  targetTokens?: number;
  overlapTokens?: number;
}
