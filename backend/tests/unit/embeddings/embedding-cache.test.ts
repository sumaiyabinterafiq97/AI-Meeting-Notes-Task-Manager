import { embeddingCacheService } from '../../../src/modules/embeddings/services/embedding-cache.service';
import { embeddingService } from '../../../src/modules/embeddings/services/embedding.service';
import { llmService } from '../../../src/modules/llm';
import { ragCacheService } from '../../../src/modules/rag/services/rag-cache.service';
import { getRedisClient } from '../../../src/config/redis';

const CACHE_MODEL = 'text-embedding-3-small';

async function clearEmbeddingCacheKeys(texts: string[]): Promise<void> {
  embeddingCacheService.clearMemory();
  const redis = getRedisClient();
  if (!redis) return;
  await Promise.all(
    texts.map((text) => redis.del(embeddingCacheService.buildKey(text, CACHE_MODEL))),
  );
}

describe('EmbeddingCacheService', () => {
  beforeEach(() => {
    embeddingCacheService.clearMemory();
    ragCacheService.clearMemory();
  });

  it('stores and retrieves vectors by text hash', async () => {
    const vector = [0.1, 0.2, 0.3];
    await embeddingCacheService.set('hello world', CACHE_MODEL, vector);

    const cached = await embeddingCacheService.get('hello world', CACHE_MODEL);
    expect(cached).toEqual(vector);
  });

  it('returns null for cache miss', async () => {
    const cached = await embeddingCacheService.get('missing text', CACHE_MODEL);
    expect(cached).toBeNull();
  });

  it('getMany preserves order for mixed hits and misses', async () => {
    await embeddingCacheService.set('cached', CACHE_MODEL, [1, 2]);

    const results = await embeddingCacheService.getMany(['cached', 'uncached'], CACHE_MODEL);

    expect(results[0]).toEqual([1, 2]);
    expect(results[1]).toBeNull();
  });
});

describe('EmbeddingService cache integration', () => {
  const texts = ['alpha chunk', 'beta chunk'];

  beforeEach(async () => {
    await clearEmbeddingCacheKeys(texts);
    jest.restoreAllMocks();
  });

  it('uses cache on second batch for identical texts', async () => {
    const embedSpy = jest.spyOn(llmService, 'embed').mockResolvedValue({
      embeddings: [
        Array.from({ length: 1536 }, (_, index) => index * 0.001),
        Array.from({ length: 1536 }, (_, index) => index * 0.002),
      ],
      model: CACHE_MODEL,
      provider: 'mock',
      totalTokens: 10,
    });

    const first = await embeddingService.generateBatch(texts, '');
    const second = await embeddingService.generateBatch(texts, '');

    expect(first.embeddings).toHaveLength(2);
    expect(second.embeddings).toHaveLength(2);
    expect(second.cacheHits).toBe(2);
    expect(second.cacheMisses).toBe(0);
    expect(second.totalTokens).toBe(0);
    expect(embedSpy).toHaveBeenCalledTimes(1);
    expect(first.embeddings[0]).toEqual(second.embeddings[0]);
  });
});
