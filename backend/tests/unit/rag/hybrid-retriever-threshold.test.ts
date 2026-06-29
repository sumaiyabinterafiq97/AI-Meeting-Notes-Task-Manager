import { hybridRetriever } from '../../../src/modules/rag/retrievers/hybrid.retriever';
import { vectorService } from '../../../src/modules/vector/services/vector.service';
import { rankingService } from '../../../src/modules/retrievers/services/ranking.service';
import type { RetrievedChunk } from '../../../src/modules/retrievers/types/retriever.types';

import type { DocumentChunk } from '../../../src/modules/vector/types/vector.types';

function mockDocumentChunk(
  overrides: Partial<DocumentChunk> & Pick<DocumentChunk, 'id' | 'content'>,
): DocumentChunk {
  return {
    workspaceId: '00000000-0000-0000-0000-000000000001',
    sourceId: overrides.id,
    chunkIndex: 0,
    sourceType: 'transcript',
    tokenCount: 10,
    metadata: {},
    similarity: 0.032,
    ...overrides,
  };
}

describe('HybridRetriever similarity threshold', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not filter RRF-fused chunks with sub-0.65 scores in hybrid mode', async () => {
    const rrfChunk: RetrievedChunk = {
      id: 'chunk-1',
      content: 'Vendor API delivery follow-up',
      sourceType: 'transcript',
      similarity: 0.032,
      metadata: {},
    };

    jest.spyOn(vectorService, 'hybridSearch').mockResolvedValue([
      mockDocumentChunk({
        id: rrfChunk.id,
        content: rrfChunk.content,
        similarity: rrfChunk.similarity,
      }),
    ]);

    const thresholdSpy = jest.spyOn(rankingService, 'applyThreshold');

    const result = await hybridRetriever.retrieve({
      query: 'vendor API delivery',
      workspaceId,
      mode: 'hybrid',
      topK: 5,
    });

    expect(thresholdSpy).not.toHaveBeenCalled();
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.content).toContain('Vendor');
  });

  it('applies cosine threshold in semantic-only mode', async () => {
    jest.spyOn(vectorService, 'hybridSearch').mockResolvedValue([
      mockDocumentChunk({ id: 'low', content: 'weak match', similarity: 0.5 }),
      mockDocumentChunk({ id: 'high', content: 'strong match', similarity: 0.9 }),
    ]);

    const result = await hybridRetriever.retrieve({
      query: 'strong match',
      workspaceId,
      mode: 'semantic',
      topK: 5,
    });

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.id).toBe('high');
  });
});
