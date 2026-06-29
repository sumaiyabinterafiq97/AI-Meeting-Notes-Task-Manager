import { env } from '../../../config/env';
import { llmService } from '../../llm';
import { BaseBatchEmbeddingProvider } from './base-batch-embedding.provider';
import type { ProviderEmbedResponse } from './base-batch-embedding.provider';

/** Google Gemini embeddings via LLM service layer. */
export class GeminiEmbeddingProvider extends BaseBatchEmbeddingProvider {
  readonly id = 'gemini';

  protected async callProvider(
    texts: string[],
    model: string,
    workspaceId?: string,
  ): Promise<ProviderEmbedResponse> {
    if (!env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured for Gemini embeddings');
    }

    const response = await llmService.embed(
      { texts, model, workspaceId },
      { providerOverride: 'google' },
    );

    return {
      embeddings: response.embeddings,
      model: response.model,
      totalTokens: response.totalTokens,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(env.GOOGLE_API_KEY);
  }
}

export const geminiEmbeddingProvider = new GeminiEmbeddingProvider();
