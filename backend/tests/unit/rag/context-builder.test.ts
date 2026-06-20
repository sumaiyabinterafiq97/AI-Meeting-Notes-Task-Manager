import { contextBuilderService } from '../../../src/modules/rag/context-builders/context-builder.service';

describe('context-builder', () => {
  it('deduplicates chunks by source identity and assigns citation indices', () => {
    const context = contextBuilderService.build([
      {
        id: 'a',
        content: 'Follow up with vendor about API delivery.',
        meetingId: 'm1',
        sourceType: 'transcript',
        sourceId: 'src-1',
        chunkIndex: 0,
        similarity: 0.9,
        metadata: { meetingTitle: 'Vendor Sync', speaker: 'Alex' },
      },
      {
        id: 'b',
        content: 'Follow up with vendor about API delivery.',
        meetingId: 'm1',
        sourceType: 'transcript',
        sourceId: 'src-1',
        chunkIndex: 0,
        similarity: 0.8,
        metadata: { meetingTitle: 'Vendor Sync' },
      },
      {
        id: 'c',
        content: 'Ship Friday was agreed.',
        meetingId: 'm1',
        sourceType: 'decision',
        sourceId: 'src-2',
        chunkIndex: 0,
        similarity: 0.7,
        metadata: { meetingTitle: 'Vendor Sync' },
      },
    ]);

    expect(context.blocks).toHaveLength(2);
    expect(context.blocks[0].citationIndex).toBe(1);
    expect(context.blocks[1].citationIndex).toBe(2);
    expect(context.totalTokens).toBeGreaterThan(0);
  });

  it('sorts similar chunks chronologically as a tie-breaker', () => {
    const context = contextBuilderService.build([
      {
        id: 'older',
        content: 'Earlier discussion point.',
        meetingId: 'm1',
        sourceType: 'transcript',
        sourceId: 'src-1',
        chunkIndex: 0,
        similarity: 0.81,
        metadata: { meetingDate: '2026-06-10T10:00:00.000Z' },
      },
      {
        id: 'newer',
        content: 'Later discussion point.',
        meetingId: 'm1',
        sourceType: 'transcript',
        sourceId: 'src-2',
        chunkIndex: 0,
        similarity: 0.8,
        metadata: { meetingDate: '2026-06-12T10:00:00.000Z' },
      },
    ]);

    expect(context.blocks[0].chunkId).toBe('older');
    expect(context.blocks[1].chunkId).toBe('newer');
  });

  it('formats blocks with citation markers', () => {
    const formatted = contextBuilderService.formatBlocks([
      {
        citationIndex: 1,
        chunkId: 'chunk-1',
        content: 'Vendor delay is a risk.',
        meetingId: 'm1',
        meetingTitle: 'Planning',
        metadata: { speaker: 'Sam', timestamp_start: '00:05:12' },
      },
    ]);

    expect(formatted).toContain('[CITATION-1]');
    expect(formatted).toContain('Vendor delay is a risk.');
    expect(formatted).toContain('Speaker: Sam');
  });
});
