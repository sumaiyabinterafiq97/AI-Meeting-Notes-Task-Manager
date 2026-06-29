import {
  embeddingValidatorService,
  EmbeddingValidationError,
} from '../../../src/modules/embeddings/services/embedding-validator.service';
import { chunkMetadataService } from '../../../src/modules/embeddings/services/chunk-metadata.service';
import { hashChunkContent } from '../../../src/modules/embeddings/lib/content-hash';
import { EMBEDDING_DIMENSIONS } from '../../../src/modules/embeddings/lib/embedding.constants';

describe('EmbeddingValidatorService', () => {
  it('filters empty texts while preserving index mapping', () => {
    const { texts, originalIndices } = embeddingValidatorService.filterEmptyTexts([
      'hello',
      '   ',
      'world',
    ]);

    expect(texts).toEqual(['hello', 'world']);
    expect(originalIndices).toEqual([0, 2]);
  });

  it('remaps embeddings back to original positions', () => {
    const remapped = embeddingValidatorService.remapEmbeddings(
      3,
      [0, 2],
      [[1], [2]],
    );
    expect(remapped[0]).toEqual([1]);
    expect(remapped[1]).toEqual([]);
    expect(remapped[2]).toEqual([2]);
  });

  it('rejects invalid vector dimensions', () => {
    expect(() =>
      embeddingValidatorService.assertVectorDimensions([[0.1, 0.2]], EMBEDDING_DIMENSIONS),
    ).toThrow(EmbeddingValidationError);
  });
});

describe('ChunkMetadataService', () => {
  it('adds contentHash to chunk metadata', () => {
    const metadata = chunkMetadataService.enrich({
      content: 'Decision text',
      chunkIndex: 0,
      tokenCount: 5,
      sourceType: 'decision',
      sourceId: 'src-1',
      metadata: { meetingTitle: 'Sync' },
    });

    expect(metadata.contentHash).toBe(hashChunkContent('Decision text'));
    expect(metadata.meetingTitle).toBe('Sync');
  });
});
