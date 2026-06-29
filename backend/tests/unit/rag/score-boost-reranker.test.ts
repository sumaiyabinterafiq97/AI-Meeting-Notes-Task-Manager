import { scoreBoostReranker } from '../../../src/modules/rag/rerankers/score-boost.reranker';
import type { RetrievedChunk } from '../../../src/modules/retrievers/types/retriever.types';

describe('ScoreBoostReranker', () => {
  const baseChunk = (overrides: Partial<RetrievedChunk>): RetrievedChunk => ({
    id: '1',
    content: 'test',
    sourceType: 'transcript',
    similarity: 0.8,
    metadata: {},
    ...overrides,
  });

  it('boosts decision chunks for decision queries', () => {
    const chunks: RetrievedChunk[] = [
      baseChunk({ id: 't1', sourceType: 'transcript', similarity: 0.82 }),
      baseChunk({ id: 'd1', sourceType: 'decision', similarity: 0.78 }),
    ];

    const ranked = scoreBoostReranker.rerank(chunks, 'What did we decide about launch?', 2);
    expect(ranked[0]?.sourceType).toBe('decision');
  });

  it('boosts recent meetings when scores are close', () => {
    const recentDate = new Date().toISOString();
    const oldDate = new Date('2020-01-01').toISOString();

    const chunks: RetrievedChunk[] = [
      baseChunk({ id: 'old', similarity: 0.81, metadata: { meetingDate: oldDate } }),
      baseChunk({ id: 'new', similarity: 0.78, metadata: { meetingDate: recentDate } }),
    ];

    const ranked = scoreBoostReranker.rerank(chunks, 'general query', 2);
    expect(ranked[0]?.id).toBe('new');
  });

  it('returns topK results', () => {
    const chunks = Array.from({ length: 20 }, (_, i) =>
      baseChunk({ id: String(i), similarity: 0.5 + i * 0.01 }),
    );
    const ranked = scoreBoostReranker.rerank(chunks, 'query', 5);
    expect(ranked).toHaveLength(5);
  });
});
