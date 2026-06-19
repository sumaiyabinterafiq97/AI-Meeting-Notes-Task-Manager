import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMEmbedRequest,
  LLMEmbedResponse,
  LLMProviderId,
  LLMStreamChunk,
  ModelInfo,
} from '../types/llm.types';

/**
 * Provider abstraction for MeetingMind AI.
 * Implementations must not contain business logic — transport only.
 */
export interface ILLMProvider {
  readonly id: LLMProviderId;

  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;

  completeStream?(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk>;

  embed(request: LLMEmbedRequest): Promise<LLMEmbedResponse>;

  getModelInfo(modelId: string): ModelInfo;

  healthCheck(): Promise<boolean>;
}
