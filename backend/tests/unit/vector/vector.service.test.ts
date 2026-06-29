import { embeddingService } from '../../../src/modules/embeddings/services/embedding.service';
import { vectorRepository } from '../../../src/modules/vector/repositories/vector.repository';
import { vectorService } from '../../../src/modules/vector/services/vector.service';

describe('vector service', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses embedding service cache for semantic search', async () => {
    const generateBatch = jest.spyOn(embeddingService, 'generateBatch').mockResolvedValue({
      embeddings: [[0.1, 0.2]],
      model: 'text-embedding-3-small',
      dimensions: 2,
      totalTokens: 5,
      cacheHits: 1,
      cacheMisses: 0,
    });

    jest.spyOn(vectorRepository, 'similaritySearch').mockResolvedValue([
      {
        id: 'chunk-1',
        workspaceId,
        sourceType: 'transcript',
        sourceId: 'src-1',
        chunkIndex: 0,
        content: 'Vendor API delivery timeline.',
        tokenCount: 10,
        metadata: {},
        similarity: 0.9,
      },
    ]);

    const results = await vectorService.semanticSearch({
      workspaceId,
      query: 'vendor API',
      mode: 'semantic',
    });

    expect(generateBatch).toHaveBeenCalledWith(['vendor API'], workspaceId);
    expect(results).toHaveLength(1);
  });

  it('falls back to keyword search when semantic search fails', async () => {
    jest.spyOn(embeddingService, 'generateBatch').mockRejectedValue(new Error('embed failed'));
    const keywordSearch = jest.spyOn(vectorRepository, 'keywordSearch').mockResolvedValue([
      {
        id: 'chunk-2',
        workspaceId,
        sourceType: 'summary',
        sourceId: 'src-2',
        chunkIndex: 0,
        content: 'Vendor follow-up required.',
        tokenCount: 8,
        metadata: {},
        similarity: 0.5,
      },
    ]);

    const results = await vectorService.hybridSearch({
      workspaceId,
      query: 'vendor follow-up',
      mode: 'semantic',
    });

    expect(keywordSearch).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('chunk-2');
  });

  it('returns keyword results when semantic search is empty in hybrid mode', async () => {
    jest.spyOn(embeddingService, 'generateBatch').mockResolvedValue({
      embeddings: [[0.1]],
      model: 'text-embedding-3-small',
      dimensions: 1,
      totalTokens: 1,
    });
    jest.spyOn(vectorRepository, 'similaritySearch').mockResolvedValue([]);
    jest.spyOn(vectorRepository, 'keywordSearch').mockResolvedValue([
      {
        id: 'chunk-3',
        workspaceId,
        sourceType: 'transcript',
        sourceId: 'src-3',
        chunkIndex: 0,
        content: 'Keyword-only hit.',
        tokenCount: 5,
        metadata: {},
      },
    ]);

    const results = await vectorService.hybridSearch({
      workspaceId,
      query: 'keyword-only',
      mode: 'hybrid',
      topK: 3,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('Keyword-only hit.');
  });
});
