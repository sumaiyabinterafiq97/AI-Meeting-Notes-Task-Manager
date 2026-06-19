import { contextBuilderService } from '../../../src/modules/rag/context-builders/context-builder.service';

describe('context-builder', () => {
  it('deduplicates chunks and assigns citation indices', () => {
    const context = contextBuilderService.build([
      {
        id: 'a',
        content: 'Follow up with vendor about API delivery.',
        meetingId: 'm1',
        sourceType: 'TRANSCRIPT',
        similarity: 0.9,
        metadata: { meetingTitle: 'Vendor Sync', speaker: 'Alex' },
      },
      {
        id: 'b',
        content: 'Follow up with vendor about API delivery.',
        meetingId: 'm1',
        sourceType: 'TRANSCRIPT',
        similarity: 0.8,
        metadata: { meetingTitle: 'Vendor Sync' },
      },
      {
        id: 'c',
        content: 'Ship Friday was agreed.',
        meetingId: 'm1',
        sourceType: 'DECISION',
        similarity: 0.7,
        metadata: { meetingTitle: 'Vendor Sync' },
      },
    ]);

    expect(context.blocks).toHaveLength(2);
    expect(context.blocks[0].citationIndex).toBe(1);
    expect(context.blocks[1].citationIndex).toBe(2);
    expect(context.totalTokens).toBeGreaterThan(0);
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
