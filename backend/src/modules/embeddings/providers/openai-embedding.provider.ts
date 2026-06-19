import { llmService } from '../../llm';
import { embeddingService } from '../services/embedding.service';
import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';
import type { IEmbeddingProvider } from './embedding-provider.interface';

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  readonly id = 'openai';

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    return embeddingService.generate(request);
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
