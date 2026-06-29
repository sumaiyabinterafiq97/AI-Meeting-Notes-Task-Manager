import { sourceAttributionService } from '../../../src/modules/retrievers/services/source-attribution.service';
import { retrievalFallbackService } from '../../../src/modules/retrievers/services/retrieval-fallback.service';
import { vectorService } from '../../../src/modules/vector/services/vector.service';

jest.mock('../../../src/modules/vector/services/vector.service', () => ({
  vectorService: {
    hybridSearch: jest.fn(),
    keywordOnlySearch: jest.fn(),
  },
}));

describe('SourceAttributionService', () => {
  it('builds citations with confidence scores', () => {
    const citations = sourceAttributionService.buildCitations([
      {
        id: 'c1',
        content: 'We agreed to delay the launch until April.',
        sourceType: 'decision',
        meetingId: 'm1',
        similarity: 0.91,
        metadata: { meetingTitle: 'Planning', meetingDate: '2026-06-15' },
      },
      {
        id: 'c2',
        content: 'Minor note.',
        sourceType: 'transcript',
        similarity: 0.62,
        metadata: {},
      },
    ]);

    expect(citations).toHaveLength(2);
    expect(citations[0]?.confidence).toBe('high');
    expect(citations[1]?.confidence).toBe('low');
    expect(citations[0]?.excerpt).toContain('delay the launch');
  });
});

describe('RetrievalFallbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to keyword search when hybrid fails', async () => {
    (vectorService.hybridSearch as jest.Mock).mockRejectedValue(new Error('pgvector down'));
    (vectorService.keywordOnlySearch as jest.Mock).mockResolvedValue([
      {
        id: 'k1',
        content: 'Docker deployment discussion',
        sourceType: 'transcript',
        sourceId: 's1',
        chunkIndex: 0,
        tokenCount: 10,
        metadata: {},
        similarity: 0.5,
      },
    ]);

    const result = await retrievalFallbackService.searchWithFallback(
      'Docker',
      { workspaceId: '00000000-0000-0000-0000-000000000001' },
      'hybrid',
      5,
    );

    expect(result.retrievalMode).toBe('keyword_only');
    expect(result.chunks).toHaveLength(1);
  });
});
