export type ChunkSourceType =
  | 'transcript'
  | 'summary'
  | 'decision'
  | 'risk'
  | 'action_item'
  | 'task'
  | 'knowledge';

export type ChunkingStrategyName =
  | 'fixed'
  | 'recursive'
  | 'sliding'
  | 'semantic'
  | 'single'
  | 'transcript';

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
  strategy?: ChunkingStrategyName;
}
