import { citationParserService } from '../../../src/modules/rag/services/citation-parser.service';

describe('citation-parser', () => {
  it('extracts citation references from assistant text', () => {
    const refs = citationParserService.extractCitationReferences(
      'The vendor delay was noted [CITATION-1] and shipping Friday [CITATION-2].',
    );

    expect(refs).toEqual([1, 2]);
  });

  it('maps citations to context blocks', () => {
    const citations = citationParserService.mapCitations(
      'See [CITATION-1] for details.',
      [
        {
          citationIndex: 1,
          chunkId: 'chunk-1',
          content: 'Vendor API may slip.',
          meetingId: 'm1',
          meetingTitle: 'Sync',
          metadata: { timestamp_start: '00:01:00' },
        },
      ],
    );

    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      index: 1,
      chunkId: 'chunk-1',
      meetingId: 'm1',
      meetingTitle: 'Sync',
      timestamp: '00:01:00',
    });
  });
});
