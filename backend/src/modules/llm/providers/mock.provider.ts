import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import { getDefaultModelForProvider, resolveModelInfo } from '../config/model-catalog';
import {
  buildMockCompletionContent,
  buildMockChatToolResponse,
  buildMockEmbedding,
} from '../fixtures/mock-responses';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMEmbedRequest,
  LLMEmbedResponse,
  LLMStreamChunk,
} from '../types/llm.types';
import { throwIfAborted } from '../services/streaming.service';

export class MockLLMProvider implements ILLMProvider {
  readonly id = 'mock' as const;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const promptTokens = request.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const toolResponse =
      request.workflow === 'chat' && request.tools?.length
        ? buildMockChatToolResponse(request)
        : { content: buildMockCompletionContent(request), finishReason: 'stop' as const };
    const content = toolResponse.content;
    const completionTokens = Math.ceil(content.length / 4);

    return {
      content,
      model: 'mock',
      provider: 'mock',
      promptTokens,
      completionTokens,
      finishReason: toolResponse.finishReason,
      toolCalls: toolResponse.toolCalls,
    };
  }

  async *completeStream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    const content = buildMockCompletionContent(request);
    const words = content.split(' ');

    for (const word of words) {
      throwIfAborted(request.signal);
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
