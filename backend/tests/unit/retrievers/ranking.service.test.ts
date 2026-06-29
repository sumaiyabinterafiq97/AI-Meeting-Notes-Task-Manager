import { rankingService } from '../../../src/modules/retrievers/services/ranking.service';
import type { RetrievedChunk } from '../../../src/modules/retrievers/types/retriever.types';

describe('RankingService', () => {
  const chunk = (id: string, similarity: number, sourceId?: string): RetrievedChunk => ({
    id,
    content: `content-${id}`,
    sourceType: 'transcript',
    sourceId: sourceId ?? id,
    chunkIndex: 0,
    similarity,
    metadata: {},
  });

  it('filters by similarity threshold', () => {
    const result = rankingService.applyThreshold(
      [chunk('a', 0.9), chunk('b', 0.5)],
      0.65,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a');
  });

  it('deduplicates by source', () => {
    const result = rankingService.deduplicateBySource([
      chunk('a', 0.9, 'src-1'),
      chunk('b', 0.8, 'src-1'),
    ]);
    expect(result).toHaveLength(1);
  });

  it('ranks by similarity descending', () => {
    const result = rankingService.rankBySimilarity([chunk('low', 0.5), chunk('high', 0.95)]);
    expect(result[0]?.id).toBe('high');
  });
});
