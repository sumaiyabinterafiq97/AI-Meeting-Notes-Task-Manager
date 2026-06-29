import { contextCompressionService } from '../../../src/modules/rag/context-builders/services/context-compression.service';
import { citationMapperService } from '../../../src/modules/rag/context-builders/services/citation-mapper.service';
import { contextBuilderService } from '../../../src/modules/rag/context-builders/context-builder.service';

describe('context compression', () => {
  it('compresses long content to fit token budget', () => {
    const long =
      'First sentence about vendor delay. Second sentence with more detail. Third sentence adds context.';
    const compressed = contextCompressionService.compressChunk(long, 10);
    expect(compressed.length).toBeLessThan(long.length);
    expect(compressed).toContain('First sentence');
  });
});

describe('citation mapper', () => {
  it('maps blocks to citation DTOs with excerpts', () => {
    const citations = citationMapperService.mapBlocks([
      {
        citationIndex: 1,
        chunkId: 'c1',
        content: 'Vendor API delivery timeline was discussed at length.',
        meetingId: 'm1',
        meetingTitle: 'Sync',
        metadata: { sourceType: 'transcript' },
      },
    ]);

    expect(citations[0]?.index).toBe(1);
    expect(citations[0]?.excerpt.length).toBeLessThanOrEqual(200);
    expect(citations[0]?.meetingTitle).toBe('Sync');
  });
});

describe('context builder use cases', () => {
  const chunk = {
    id: 'x',
    content: 'Decision recorded.',
    meetingId: 'm1',
    sourceType: 'decision',
    sourceId: 's1',
    chunkIndex: 0,
    similarity: 0.9,
    metadata: { meetingTitle: 'Planning' },
  };

  it('buildForWeeklyReport uses weekly token budget', () => {
    const context = contextBuilderService.buildForWeeklyReport([chunk]);
    expect(context.useCase).toBe('weekly');
    expect(context.tokenBudget).toBeGreaterThan(24_000);
  });
});
