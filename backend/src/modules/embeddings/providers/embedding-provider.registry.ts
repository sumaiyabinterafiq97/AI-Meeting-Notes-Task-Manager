import type { IEmbeddingProvider } from './embedding-provider.interface';
import { openAIEmbeddingProvider } from './openai-embedding.provider';

export class EmbeddingProviderRegistry {
  private readonly providers = new Map<string, IEmbeddingProvider>();

  constructor() {
    this.register(openAIEmbeddingProvider);
  }

  register(provider: IEmbeddingProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IEmbeddingProvider | undefined {
    return this.providers.get(id);
  }

  getOrThrow(id: string): IEmbeddingProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Embedding provider not registered: ${id}`);
    }
    return provider;
  }

  getDefault(): IEmbeddingProvider {
    return this.getOrThrow('openai');
  }

  list(): IEmbeddingProvider[] {
    return [...this.providers.values()];
  }
}

export const embeddingProviderRegistry = new EmbeddingProviderRegistry();
