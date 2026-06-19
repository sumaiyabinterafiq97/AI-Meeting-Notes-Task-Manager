import { GoogleGenerativeAI } from '@google/generative-ai';
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

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.GOOGLE_API_KEY) {
    throw new LLMProviderError('GOOGLE_API_KEY is not configured', 'google', undefined, false);
  }
  if (!client) {
    client = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  }
  return client;
}

function mapError(error: unknown): LLMProviderError {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : 'Gemini request failed';
  return new LLMProviderError(message, 'google', status, status === 429 || (status !== undefined && status >= 500));
}

export class GeminiProvider implements ILLMProvider {
  readonly id = 'google' as const;

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    try {
      const google = getClient();
      const modelName =
        request.model ?? getDefaultModelForProvider('google', request.workflow ?? 'process-meeting');

      const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
      const userContent = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n\n');

      const model = google.getGenerativeModel({
        model: modelName,
        ...(systemMessage ? { systemInstruction: systemMessage } : {}),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          ...(request.responseFormat === 'json_schema'
            ? { responseMimeType: 'application/json' }
            : {}),
        },
      });

      const result = await model.generateContent(userContent);
      const content = result.response.text();

      if (!content) {
        throw new LLMProviderError('Gemini returned empty response', 'google', undefined, true);
      }

      const usage = result.response.usageMetadata;

      return {
        content,
        model: modelName,
        provider: 'google',
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        finishReason: 'stop',
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapError(error);
    }
  }

  async *completeStream(request: LLMCompletionRequest): AsyncIterable<LLMStreamChunk> {
    try {
      const google = getClient();
      const modelName = request.model ?? getDefaultModelForProvider('google', request.workflow ?? 'chat');

      const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
      const userContent = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n\n');

      const model = google.getGenerativeModel({
        model: modelName,
        ...(systemMessage ? { systemInstruction: systemMessage } : {}),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
      });

      const stream = await model.generateContentStream(userContent);

      for await (const chunk of stream.stream) {
        const text = chunk.text();
        if (text) {
          yield { content: text, done: false };
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
      const google = getClient();
      const modelName = request.model ?? getDefaultModelForProvider('google', 'embed');
      const model = google.getGenerativeModel({ model: modelName });

      const embeddings: number[][] = [];
      let totalTokens = 0;

      for (const text of request.texts) {
        const result = await model.embedContent(text);
        const values = result.embedding.values;
        embeddings.push([...values]);
        totalTokens += Math.ceil(text.length / 4);
      }

      return {
        embeddings,
        model: modelName,
        provider: 'google',
        totalTokens,
      };
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw mapError(error);
    }
  }

  getModelInfo(modelId: string) {
    return resolveModelInfo(modelId, 'google');
  }

  async healthCheck(): Promise<boolean> {
    if (!env.GOOGLE_API_KEY) return false;
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
