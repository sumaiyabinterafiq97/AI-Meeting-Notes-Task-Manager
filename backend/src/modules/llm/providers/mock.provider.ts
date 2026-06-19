import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import { getDefaultModelForProvider, resolveModelInfo } from '../config/model-catalog';
import {
  buildMockCompletionContent,
  buildMockEmbedding,
} from '../fixtures/mock-responses';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMEmbedRequest,
  LLMEmbedResponse,
  LLMStreamChunk,
} from '../types/llm.types';

export class MockLLMProvider implements ILLMProvider {
  readonly id = 'mock' as const;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const content = buildMockCompletionContent(request);
    const promptTokens = request.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);

    return {
      content,
      model: 'mock',
      provider: 'mock',
      promptTokens,
      completionTokens: Math.ceil(content.length / 4),
      finishReason: 'stop',
    };
  }

  async *completeStream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    const content = buildMockCompletionContent(request);
    const words = content.split(' ');

    for (const word of words) {
      yield { content: `${word} `, done: false };
    }

    yield { content: '', done: true };
  }

  async embed(request: LLMEmbedRequest): Promise<LLMEmbedResponse> {
    const embeddings = request.texts.map((text) => buildMockEmbedding(text));
    const totalTokens = request.texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    return {
      embeddings,
      model: request.model ?? getDefaultModelForProvider('mock', 'embed'),
      provider: 'mock',
      totalTokens,
    };
  }

  getModelInfo(modelId: string) {
    return resolveModelInfo(modelId, 'mock');
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
