import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';
import type { IEmbeddingProvider } from './embedding-provider.interface';

/** Placeholder for VoyageAI — register when VOYAGE_API_KEY is configured. */
export class VoyageEmbeddingProvider implements IEmbeddingProvider {
  readonly id = 'voyage';

  async embed(_request: EmbeddingRequest): Promise<EmbeddingResult> {
    throw new Error('VoyageAI embedding provider is not configured. Set VOYAGE_API_KEY to enable.');
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

export const voyageEmbeddingProvider = new VoyageEmbeddingProvider();
