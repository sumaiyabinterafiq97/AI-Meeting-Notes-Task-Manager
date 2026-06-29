import { ragCacheService } from '../../../src/modules/rag/services/rag-cache.service';
import { ragCacheObservabilityService } from '../../../src/modules/rag/services/rag-cache-observability.service';
import { embeddingCacheService } from '../../../src/modules/embeddings/services/embedding-cache.service';

describe('rag cache observability', () => {
  beforeEach(() => {
    ragCacheService.clearMemory();
    ragCacheObservabilityService.reset();
  });

  it('tracks retrieval cache hits and misses by namespace', async () => {
    await ragCacheService.setRetrieval('ws-1', 'hash-1', [{ id: 'c1' }]);
    const hit = await ragCacheService.getRetrieval('ws-1', 'hash-1');
    const miss = await ragCacheService.getRetrieval('ws-1', 'hash-missing');

    expect(hit).toEqual([{ id: 'c1' }]);
    expect(miss).toBeNull();

    const stats = ragCacheService.getStats();
    expect(stats.byNamespace['rag:ret']?.hits).toBe(1);
    expect(stats.byNamespace['rag:ret']?.misses).toBe(1);
  });

  it('tracks context cache separately from retrieval cache', async () => {
    await ragCacheService.setContext('ws-1', 'ctx-1', { blocks: [] });
    await ragCacheService.getContext('ws-1', 'ctx-1');
    await ragCacheService.getContext('ws-1', 'ctx-missing');

    const stats = ragCacheService.getStats();
    expect(stats.byNamespace['rag:ctx']?.hits).toBe(1);
    expect(stats.byNamespace['rag:ctx']?.misses).toBe(1);
  });

  it('invalidates workspace retrieval and context caches', async () => {
    await ragCacheService.setRetrieval('ws-1', 'hash-1', [{ id: 'c1' }]);
    await ragCacheService.setContext('ws-1', 'ctx-1', { blocks: [] });
    await ragCacheService.invalidateWorkspace('ws-1');

    expect(await ragCacheService.getRetrieval('ws-1', 'hash-1')).toBeNull();
    expect(await ragCacheService.getContext('ws-1', 'ctx-1')).toBeNull();
  });
});

describe('embedding cache observability', () => {
  beforeEach(() => {
    embeddingCacheService.clearMemory();
    ragCacheObservabilityService.reset();
  });

  it('records embedding cache hits and misses', async () => {
    await embeddingCacheService.set('hello', 'text-embedding-3-small', [0.1]);
    await embeddingCacheService.get('hello', 'text-embedding-3-small');
    await embeddingCacheService.get('missing', 'text-embedding-3-small');

    const stats = ragCacheObservabilityService.getSnapshot();
    expect(stats.byNamespace.emb?.hits).toBe(1);
    expect(stats.byNamespace.emb?.misses).toBe(1);
  });
});

describe('cache hit rate alert', () => {
  beforeEach(() => {
    ragCacheObservabilityService.reset();
  });

  it('alerts when hit rate drops below threshold after enough samples', () => {
    for (let index = 0; index < 25; index += 1) {
      ragCacheObservabilityService.record({ namespace: 'rag:ret', hit: false });
    }
    ragCacheObservabilityService.record({ namespace: 'rag:ret', hit: true });

    expect(ragCacheObservabilityService.checkHitRateAlert(0.2)).toContain('below');
  });
});
