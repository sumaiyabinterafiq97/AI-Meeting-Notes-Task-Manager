import { embeddingProviderRegistry } from '../../../src/modules/embeddings/providers/embedding-provider.registry';

describe('EmbeddingProviderRegistry', () => {
  it('registers the default OpenAI embedding provider', () => {
    const providers = embeddingProviderRegistry.list();
    expect(providers.map((provider) => provider.id)).toContain('openai');
  });

  it('returns default provider', () => {
    expect(embeddingProviderRegistry.getDefault().id).toBe('openai');
  });
});
