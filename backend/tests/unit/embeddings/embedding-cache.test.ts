import { embeddingCacheService } from '../../../src/modules/embeddings/services/embedding-cache.service';
import { embeddingService } from '../../../src/modules/embeddings/services/embedding.service';
import { llmService } from '../../../src/modules/llm';
import { ragCacheService } from '../../../src/modules/rag/services/rag-cache.service';

describe('EmbeddingCacheService', () => {
  beforeEach(() => {
    embeddingCacheService.clearMemory();
    ragCacheService.clearMemory();
  });

  it('stores and retrieves vectors by text hash', async () => {
    const vector = [0.1, 0.2, 0.3];
    await embeddingCacheService.set('hello world', 'text-embedding-3-small', vector);

    const cached = await embeddingCacheService.get('hello world', 'text-embedding-3-small');
    expect(cached).toEqual(vector);
  });

  it('returns null for cache miss', async () => {
    const cached = await embeddingCacheService.get('missing text', 'text-embedding-3-small');
    expect(cached).toBeNull();
  });

  it('getMany preserves order for mixed hits and misses', async () => {
    await embeddingCacheService.set('cached', 'text-embedding-3-small', [1, 2]);

    const results = await embeddingCacheService.getMany(
      ['cached', 'uncached'],
      'text-embedding-3-small',
    );

    expect(results[0]).toEqual([1, 2]);
    expect(results[1]).toBeNull();
  });
});

describe('EmbeddingService cache integration', () => {
  beforeEach(() => {
    embeddingCacheService.clearMemory();
    jest.restoreAllMocks();
  });

  it('uses cache on second batch for identical texts', async () => {
    const embedSpy = jest.spyOn(llmService, 'embed').mockResolvedValue({
      embeddings: [
        Array.from({ length: 1536 }, (_, index) => index * 0.001),
        Array.from({ length: 1536 }, (_, index) => index * 0.002),
      ],
      model: 'text-embedding-3-small',
      provider: 'mock',
      totalTokens: 10,
    });

    const first = await embeddingService.generateBatch(
      ['alpha chunk', 'beta chunk'],
      '',
    );
    const second = await embeddingService.generateBatch(
      ['alpha chunk', 'beta chunk'],
      '',
    );

    expect(first.embeddings).toHaveLength(2);
    expect(second.embeddings).toHaveLength(2);
    expect(second.cacheHits).toBe(2);
    expect(second.cacheMisses).toBe(0);
    expect(second.totalTokens).toBe(0);
    expect(embedSpy).toHaveBeenCalledTimes(1);
    expect(first.embeddings[0]).toEqual(second.embeddings[0]);
  });
});
