import { llmService } from '../../llm';
import { BaseBatchEmbeddingProvider } from './base-batch-embedding.provider';
import type { ProviderEmbedResponse } from './base-batch-embedding.provider';

/** OpenAI embeddings via LLM service layer. */
export class OpenAIEmbeddingProvider extends BaseBatchEmbeddingProvider {
  readonly id = 'openai';

  protected async callProvider(
    texts: string[],
    model: string,
    workspaceId?: string,
  ): Promise<ProviderEmbedResponse> {
    const response = await llmService.embed({
      texts,
      model,
      workspaceId,
    });

    return {
      embeddings: response.embeddings,
      model: response.model,
      totalTokens: response.totalTokens,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await llmService.embed({ texts: ['health-check'] });
      return true;
    } catch {
      return false;
    }
  }
}

export const openAIEmbeddingProvider = new OpenAIEmbeddingProvider();
