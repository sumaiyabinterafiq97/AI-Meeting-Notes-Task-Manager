import { embeddingService } from '../../../src/modules/embeddings/services/embedding.service';
import { vectorRepository } from '../../../src/modules/vector/repositories/vector.repository';
import { hybridSearchService } from '../../../src/modules/vector/services/hybrid-search.service';
import { reciprocalRankFusion } from '../../../src/modules/vector/services/rrf.service';

describe('hybrid search service', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const semanticChunk = {
    id: 'sem-1',
    workspaceId,
    sourceType: 'transcript' as const,
    sourceId: 'src-1',
    chunkIndex: 0,
    content: 'Semantic match about vendor API.',
    tokenCount: 10,
    metadata: {},
    similarity: 0.85,
  };

  const keywordChunk = {
    id: 'kw-1',
    workspaceId,
    sourceType: 'summary' as const,
    sourceId: 'src-2',
    chunkIndex: 0,
    content: 'Keyword match vendor follow-up.',
    tokenCount: 8,
    metadata: {},
    similarity: 0.6,
  };

  it('returns structured results with semantic and keyword scores in hybrid mode', async () => {
    jest.spyOn(embeddingService, 'generateBatch').mockResolvedValue({
      embeddings: [[0.1, 0.2]],
      model: 'text-embedding-3-small',
      dimensions: 2,
      totalTokens: 5,
    });
    jest.spyOn(vectorRepository, 'similaritySearch').mockResolvedValue([semanticChunk]);
    jest.spyOn(vectorRepository, 'keywordSearch').mockResolvedValue([keywordChunk]);

    const result = await hybridSearchService.search(
      { workspaceId, query: 'vendor API', mode: 'hybrid', topK: 5 },
      'rrf',
    );

    expect(result.semanticCount).toBe(1);
    expect(result.keywordCount).toBe(1);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]?.scores.fused).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('supports weighted fusion strategy', async () => {
    jest.spyOn(embeddingService, 'generateBatch').mockResolvedValue({
      embeddings: [[0.1]],
      model: 'text-embedding-3-small',
      dimensions: 1,
      totalTokens: 1,
    });
    jest.spyOn(vectorRepository, 'similaritySearch').mockResolvedValue([semanticChunk]);
    jest.spyOn(vectorRepository, 'keywordSearch').mockResolvedValue([keywordChunk]);

    const result = await hybridSearchService.search(
      { workspaceId, query: 'vendor', mode: 'hybrid', topK: 5 },
      'weighted',
    );

    expect(result.fusionStrategy).toBe('weighted');
    expect(result.items[0]?.fusionStrategy).toBe('weighted');
    expect(result.items[0]?.scores.semantic).toBe(0.85);
  });

  it('falls back to keyword when semantic is empty', async () => {
    jest.spyOn(embeddingService, 'generateBatch').mockResolvedValue({
      embeddings: [[0.1]],
      model: 'text-embedding-3-small',
      dimensions: 1,
      totalTokens: 1,
    });
    jest.spyOn(vectorRepository, 'similaritySearch').mockResolvedValue([]);
    jest.spyOn(vectorRepository, 'keywordSearch').mockResolvedValue([keywordChunk]);

    const result = await hybridSearchService.search({
      workspaceId,
      query: 'vendor',
      mode: 'hybrid',
      topK: 3,
    });

    expect(result.fusionStrategy).toBe('keyword_only');
    expect(result.items).toHaveLength(1);
  });
});

describe('rrf fusion', () => {
  it('merges ranked lists by reciprocal rank', () => {
    const listA = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const listB = [{ id: 'b' }, { id: 'c' }, { id: 'a' }];
    const fused = reciprocalRankFusion([listA, listB], (item) => item.id, 60);
    expect(fused[0]?.item.id).toBe('b');
  });
});
