/**
 * MeetingMind AI — LLM provider identifiers.
 * @see docs/llm-architecture.md
 */
export type LLMProviderId = 'openai' | 'anthropic' | 'google' | 'local' | 'mock';

export type LLMWorkflow =
  | 'process-meeting'
  | 'summarizer'
  | 'task-extractor'
  | 'decision'
  | 'risk-analyzer'
  | 'chat'
  | 'embed'
  | 'weekly-report'
  | 'knowledge-extract';

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: LLMToolCall[];
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  model?: string;
  workflow?: LLMWorkflow;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_schema';
  jsonSchema?: Record<string, unknown>;
  tools?: LLMToolDefinition[];
  toolChoice?: 'auto' | 'none';
  workspaceId?: string;
  correlationId?: string;
  signal?: AbortSignal;
}

export interface LLMCompletionResponse {
  content: string;
  model: string;
  provider: LLMProviderId;
  promptTokens: number;
  completionTokens: number;
  finishReason: string;
  toolCalls?: LLMToolCall[];
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export interface LLMEmbedRequest {
  texts: string[];
  model?: string;
  workspaceId?: string;
}

export interface LLMEmbedResponse {
  embeddings: number[][];
  model: string;
  provider: LLMProviderId;
  totalTokens: number;
}

export interface ModelInfo {
  id: string;
  provider: LLMProviderId;
  maxContextTokens: number;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
}
