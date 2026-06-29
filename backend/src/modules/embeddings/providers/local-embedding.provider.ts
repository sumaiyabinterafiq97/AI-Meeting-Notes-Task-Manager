import { env } from '../../../config/env';
import { llmService } from '../../llm';
import { BaseBatchEmbeddingProvider } from './base-batch-embedding.provider';
import type { ProviderEmbedResponse } from './base-batch-embedding.provider';

/** Local / OpenAI-compatible embedding endpoint. */
export class LocalEmbeddingProvider extends BaseBatchEmbeddingProvider {
  readonly id = 'local';

  protected async callProvider(
    texts: string[],
    model: string,
    workspaceId?: string,
  ): Promise<ProviderEmbedResponse> {
    if (!env.LOCAL_LLM_BASE_URL) {
      throw new Error('LOCAL_LLM_BASE_URL is not configured');
    }

    const response = await llmService.embed(
      { texts, model, workspaceId },
      { providerOverride: 'local' },
    );

    return {
      embeddings: response.embeddings,
      model: response.model,
      totalTokens: response.totalTokens,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(env.LOCAL_LLM_BASE_URL);
  }
}

export const localEmbeddingProvider = new LocalEmbeddingProvider();
