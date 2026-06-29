import { embeddingProviderRegistry } from '../../../src/modules/embeddings/providers/embedding-provider.registry';

describe('EmbeddingProviderRegistry', () => {
  it('registers embedding providers', () => {
    const ids = embeddingProviderRegistry.list().map((provider) => provider.id);
    expect(ids).toEqual(expect.arrayContaining(['openai', 'gemini', 'local', 'voyage']));
  });

  it('returns default provider', () => {
    expect(embeddingProviderRegistry.getDefault().id).toBe('openai');
  });
});
