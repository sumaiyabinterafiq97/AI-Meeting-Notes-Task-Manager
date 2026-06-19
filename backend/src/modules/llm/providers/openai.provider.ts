import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
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

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new LLMProviderError('OPENAI_API_KEY is not configured', 'openai', undefined, false);
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

function toOpenAIMessages(messages: LLMCompletionRequest['messages']): ChatCompletionMessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function mapOpenAIError(error: unknown): LLMProviderError {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : 'OpenAI request failed';
  const retryable = status === 429 || (status !== undefined && status >= 500);
  return new LLMProviderError(message, 'openai', status, retryable);
}

export class OpenAIProvider implements ILLMProvider {
  readonly id = 'openai' as const;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    try {
      const openai = getClient();
      const model = request.model ?? getDefaultModelForProvider('openai', request.workflow ?? 'process-meeting');

      const completion = await openai.chat.completions.create({
        model,
        messages: toOpenAIMessages(request.messages),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        ...(request.responseFormat === 'json_schema' && request.jsonSchema
          ? {
              response_format: {
                type: 'json_schema' as const,
                json_schema: request.jsonSchema as {
                  name: string;
                  strict?: boolean;
                  schema: Record<string, unknown>;
                },
              },
            }
          : {}),
      });

      const choice = completion.choices[0];
      const content = choice?.message?.content ?? '';

      if (!content) {
        throw new LLMProviderError('OpenAI returned empty response', 'openai', undefined, true);
      }

      return {
        content,
        model: completion.model,
        provider: 'openai',
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        finishReason: choice?.finish_reason ?? 'stop',
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapOpenAIError(error);
    }
  }

  async *completeStream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    try {
      const openai = getClient();
      const model = request.model ?? getDefaultModelForProvider('openai', request.workflow ?? 'chat');

      const stream = await openai.chat.completions.create({
        model,
        messages: toOpenAIMessages(request.messages),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          yield { content: delta, done: false };
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapOpenAIError(error);
    }
  }

  async embed(request: LLMEmbedRequest): Promise<LLMEmbedResponse> {
    try {
      const openai = getClient();
      const model = request.model ?? env.EMBEDDING_MODEL;

      const response = await openai.embeddings.create({
        model,
        input: request.texts,
      });

      return {
        embeddings: response.data.map((item) => item.embedding),
        model: response.model,
        provider: 'openai',
        totalTokens: response.usage?.total_tokens ?? 0,
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapOpenAIError(error);
    }
  }

  getModelInfo(modelId: string) {
    return resolveModelInfo(modelId, 'openai');
  }

  async healthCheck(): Promise<boolean> {
    if (!env.OPENAI_API_KEY) return false;
    try {
      const openai = getClient();
      await openai.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
