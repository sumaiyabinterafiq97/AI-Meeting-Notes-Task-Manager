import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';

export interface IEmbeddingProvider {
  readonly id: string;
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
  healthCheck(): Promise<boolean>;
}
