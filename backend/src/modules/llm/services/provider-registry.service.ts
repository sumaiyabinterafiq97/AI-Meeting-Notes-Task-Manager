import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import type { LLMProviderId } from '../types/llm.types';
import {
  ClaudeProvider,
  GeminiProvider,
  LocalModelProvider,
  MockLLMProvider,
  OpenAIProvider,
} from '../providers';

/**
 * Registry for LLM provider adapters.
 * Selection logic will be implemented in a future feature pass.
 */
export class ProviderRegistry {
  private readonly providers = new Map<LLMProviderId, ILLMProvider>();

  constructor() {
    this.register(new OpenAIProvider());
    this.register(new GeminiProvider());
    this.register(new ClaudeProvider());
    this.register(new LocalModelProvider());
    this.register(new MockLLMProvider());
  }

  register(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: LLMProviderId): ILLMProvider | undefined {
    return this.providers.get(id);
  }

  getOrThrow(id: LLMProviderId): ILLMProvider {
    const provider = this.get(id);
    if (!provider) {
      throw new Error(`LLM provider not registered: ${id}`);
    }
    return provider;
  }

  list(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();
