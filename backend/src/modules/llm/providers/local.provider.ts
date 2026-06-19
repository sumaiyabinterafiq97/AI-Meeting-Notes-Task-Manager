import OpenAI from 'openai';
import { env } from '../../../config/env';
import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import { LLMProviderError } from '../errors/llm.errors';
import { resolveModelInfo } from '../config/model-catalog';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMEmbedRequest,
  LLMEmbedResponse,
  LLMStreamChunk,
} from '../types/llm.types';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.LOCAL_LLM_BASE_URL) {
    throw new LLMProviderError('LOCAL_LLM_BASE_URL is not configured', 'local', undefined, false);
  }
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY ?? 'local-dev',
      baseURL: env.LOCAL_LLM_BASE_URL,
    });
  }
  return client;
}

function mapError(error: unknown): LLMProviderError {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : 'Local LLM request failed';
  return new LLMProviderError(message, 'local', status, status === 429 || (status !== undefined && status >= 500));
}

export class LocalModelProvider implements ILLMProvider {
  readonly id = 'local' as const;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    try {
      const openai = getClient();
      const model = request.model ?? env.LOCAL_LLM_MODEL;

      const completion = await openai.chat.completions.create({
        model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      });

      const choice = completion.choices[0];
      const content = choice?.message?.content ?? '';

      return {
        content,
        model: completion.model,
        provider: 'local',
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        finishReason: choice?.finish_reason ?? 'stop',
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapError(error);
    }
  }

  async *completeStream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    try {
      const openai = getClient();
      const model = request.model ?? env.LOCAL_LLM_MODEL;

      const stream = await openai.chat.completions.create({
        model,
        messages: request.messages,
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
      throw mapError(error);
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
        provider: 'local',
        totalTokens: response.usage?.total_tokens ?? 0,
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapError(error);
    }
  }

  getModelInfo(modelId: string) {
    return resolveModelInfo(modelId, 'local');
  }

  async healthCheck(): Promise<boolean> {
    if (!env.LOCAL_LLM_BASE_URL) return false;
    try {
      await this.complete({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
        workflow: 'chat',
        model: env.LOCAL_LLM_MODEL,
      });
      return true;
    } catch {
      return false;
    }
  }
}
