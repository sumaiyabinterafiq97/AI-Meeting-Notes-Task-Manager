export type RAGSearchMode = 'semantic' | 'keyword' | 'hybrid';

export interface RAGQuery {
  query: string;
  workspaceId: string;
  meetingId?: string;
  mode?: RAGSearchMode;
  topK?: number;
  sourceTypes?: string[];
}

export interface ContextBlock {
  citationIndex: number;
  chunkId?: string;
  content: string;
  meetingId?: string;
  meetingTitle?: string;
  metadata: Record<string, unknown>;
}

export interface RAGContext {
  blocks: ContextBlock[];
  totalTokens: number;
}

export interface RAGPromptPackage {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  totalTokens: number;
  promptId: string;
  promptVersion: string;
}

export interface RAGSearchResult {
  chunks: Array<{
    id: string;
    content: string;
    meetingId?: string;
    sourceType: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>;
  cacheHit: boolean;
  latencyMs: number;
}

export interface RAGPipelineResult {
  context: RAGContext;
  prompt: RAGPromptPackage;
  retrieval: RAGSearchResult;
}
