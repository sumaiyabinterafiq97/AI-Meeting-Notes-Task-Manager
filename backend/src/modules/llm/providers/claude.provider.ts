import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env';
import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import { LLMProviderError } from '../errors/llm.errors';
import { getDefaultModelForProvider, resolveModelInfo } from '../config/model-catalog';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMEmbedRequest,
  LLMEmbedResponse,
  LLMStreamChunk,
} from '../types/llm.types';
import { throwIfAborted } from '../services/streaming.service';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new LLMProviderError('ANTHROPIC_API_KEY is not configured', 'anthropic', undefined, false);
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

function mapError(error: unknown): LLMProviderError {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : 'Anthropic request failed';
  return new LLMProviderError(message, 'anthropic', status, status === 429 || (status !== undefined && status >= 500));
}

export class ClaudeProvider implements ILLMProvider {
  readonly id = 'anthropic' as const;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    try {
      const anthropic = getClient();
      const model =
        request.model ?? getDefaultModelForProvider('anthropic', request.workflow ?? 'process-meeting');

      const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
      const conversationMessages = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }));

      const response = await anthropic.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system: systemMessage,
        messages: conversationMessages,
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock && 'text' in textBlock ? textBlock.text : '';

      if (!content) {
        throw new LLMProviderError('Anthropic returned empty response', 'anthropic', undefined, true);
      }

      return {
        content,
        model: response.model,
        provider: 'anthropic',
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        finishReason: response.stop_reason ?? 'end_turn',
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapError(error);
    }
  }

  async *completeStream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    try {
      const anthropic = getClient();
      const model = request.model ?? getDefaultModelForProvider('anthropic', request.workflow ?? 'chat');

      const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
      const conversationMessages = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }));

      const stream = await anthropic.messages.stream({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system: systemMessage,
        messages: conversationMessages,
      });

      for await (const event of stream) {
        throwIfAborted(request.signal);
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { content: event.delta.text, done: false };
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapError(error);
    }
  }

  async embed(_request: LLMEmbedRequest): Promise<LLMEmbedResponse> {
    throw new LLMProviderError('Anthropic provider does not support embeddings', 'anthropic', undefined, false);
  }

  getModelInfo(modelId: string) {
    return resolveModelInfo(modelId, 'anthropic');
  }

  async healthCheck(): Promise<boolean> {
    if (!env.ANTHROPIC_API_KEY) return false;
    try {
      await this.complete({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
        workflow: 'chat',
      });
      return true;
    } catch {
      return false;
    }
  }
}
