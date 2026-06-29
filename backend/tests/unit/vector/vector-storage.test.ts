import { vectorService } from '../../../src/modules/vector/services/vector.service';
import { vectorRepository } from '../../../src/modules/vector/repositories/vector.repository';
import { SIMILARITY_THRESHOLDS } from '../../../src/modules/vector/lib/vector.constants';
import { toSearchHit } from '../../../src/modules/vector/dto/vector.dto';

jest.mock('../../../src/modules/embeddings/services/embedding.service', () => ({
  embeddingService: {
    generateBatch: jest.fn().mockResolvedValue({
      embeddings: [Array.from({ length: 1536 }, (_, i) => i * 0.0001)],
      model: 'text-embedding-3-small',
      totalTokens: 5,
    }),
  },
}));

jest.mock('../../../src/modules/vector/repositories/vector.repository', () => ({
  vectorRepository: {
    similaritySearch: jest.fn(),
    keywordSearch: jest.fn(),
  },
}));

describe('VectorService.searchPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a paginated slice of hybrid results', async () => {
    const mockChunks = Array.from({ length: 25 }, (_, index) => ({
      id: `chunk-${index}`,
      workspaceId: '00000000-0000-0000-0000-000000000010',
      sourceType: 'transcript' as const,
      sourceId: '00000000-0000-0000-0000-000000000011',
      chunkIndex: index,
      content: `result ${index}`,
      tokenCount: 10,
      metadata: {},
      similarity: 0.9 - index * 0.01,
    }));

    (vectorRepository.similaritySearch as jest.Mock).mockResolvedValue(mockChunks);
    (vectorRepository.keywordSearch as jest.Mock).mockResolvedValue(mockChunks.slice(0, 5));

    const page = await vectorService.searchPaginated({
      workspaceId: '00000000-0000-0000-0000-000000000010',
      query: 'authentication',
      mode: 'hybrid',
      page: 2,
      pageSize: 10,
      minSimilarity: SIMILARITY_THRESHOLDS.search,
    });

    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
    expect(page.items.length).toBeLessThanOrEqual(10);
  });
});

describe('toSearchHit', () => {
  it('builds excerpt and preserves similarity', () => {
    const hit = toSearchHit({
      id: 'c1',
      workspaceId: 'ws',
      sourceType: 'decision',
      sourceId: 's1',
      chunkIndex: 0,
      content: 'We decided to ship in April because of vendor constraints.',
      tokenCount: 12,
      metadata: { meetingTitle: 'Planning' },
      similarity: 0.88,
    });

    expect(hit.excerpt.length).toBeLessThanOrEqual(200);
    expect(hit.similarity).toBe(0.88);
  });
});
