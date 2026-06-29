export type RAGSearchMode = 'semantic' | 'keyword' | 'hybrid';

export interface RAGQuery {
  query: string;
  workspaceId: string;
  meetingId?: string;
  mode?: RAGSearchMode;
  topK?: number;
  similarityMin?: number;
  sourceTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  /** Classified intent from chat query classifier (FR-CHAT-CLS-001). */
  queryIntent?: string;
}

export type RAGContextUseCase = 'chat' | 'meeting' | 'weekly';

export interface ContextBlock {
  citationIndex: number;
  chunkId?: string;
  content: string;
  meetingId?: string;
  meetingTitle?: string;
  metadata: Record<string, unknown>;
}

export interface RAGContextCitation {
  index: number;
  chunkId?: string;
  meetingId?: string;
  meetingTitle?: string;
  sourceType?: string;
  excerpt: string;
  similarityScore?: number;
}

export interface RAGContext {
  blocks: ContextBlock[];
  formattedContext: string;
  citations: RAGContextCitation[];
  totalTokens: number;
  tokenBudget: number;
  chunksIncluded: number;
  chunksDropped: number;
  useCase?: RAGContextUseCase;
}

export type RAGPipelineStage =
  | 'query'
  | 'embed'
  | 'vector_search'
  | 'filter'
  | 'rank'
  | 'context'
  | 'prompt';

export interface RAGPipelineStageMetric {
  stage: RAGPipelineStage;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface RAGPipelineExecutionResult extends RAGPipelineResult {
  stages: RAGPipelineStageMetric[];
  degraded: boolean;
  retries: number;
}

export interface RAGBuildOptions {
  promptId?: string;
  variables?: Record<string, string>;
  useCase?: RAGContextUseCase;
  tokenBudget?: number;
  maxRetries?: number;
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
  retrievalMode?: 'hybrid' | 'semantic' | 'keyword' | 'keyword_only';
}

export interface RAGPipelineResult {
  context: RAGContext;
  prompt: RAGPromptPackage;
  retrieval: RAGSearchResult;
}
