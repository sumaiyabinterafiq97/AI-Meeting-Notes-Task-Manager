import { sourceCitationService } from '../../../src/modules/rag/citations/services/source-citation.service';
import type { ContextBlock } from '../../../src/modules/rag/types/rag.types';
import { NO_RELEVANT_MEETINGS_MESSAGE } from '../../../src/modules/rag/citations/lib/citation.constants';

describe('source-citation service', () => {
  const blocks: ContextBlock[] = [
    {
      citationIndex: 1,
      chunkId: '00000000-0000-0000-0000-000000000011',
      content: 'Vendor API delivery may slip to next quarter.',
      meetingId: '00000000-0000-0000-0000-000000000021',
      meetingTitle: 'Sprint Planning',
      metadata: {
        sourceType: 'transcript',
        meetingDate: '2026-06-15T10:00:00.000Z',
        timestamp_start: '00:12:34',
      },
    },
  ];

  it('builds citations from context blocks with full metadata', () => {
    const citations = sourceCitationService.buildFromBlocks(blocks, [
      {
        id: blocks[0]!.chunkId!,
        content: blocks[0]!.content,
        meetingId: blocks[0]!.meetingId,
        sourceType: 'transcript',
        similarity: 0.89,
        metadata: blocks[0]!.metadata,
      },
    ]);

    expect(citations[0]).toMatchObject({
      index: 1,
      sourceType: 'transcript',
      meetingTitle: 'Sprint Planning',
      meetingDate: '2026-06-15T10:00:00.000Z',
      similarityScore: 0.89,
      timestamp: '00:12:34',
      confidence: 'high',
    });
  });

  it('parses citation references from assistant response', () => {
    const citations = sourceCitationService.parseFromResponse(
      'The vendor delay was noted [CITATION-1].',
      blocks,
    );

    expect(citations).toHaveLength(1);
    expect(citations[0]?.chunkId).toBe(blocks[0]?.chunkId);
    expect(citations[0]?.claimText).toContain('[CITATION-1]');
  });

  it('flags missing citations when context exists (FR-RAG-CITE-003)', () => {
    const validation = sourceCitationService.validate(
      'The vendor will delay without citing sources.',
      [],
      blocks,
      false,
    );

    expect(validation.missingCitationForGroundedAnswer).toBe(true);
    expect(validation.valid).toBe(false);
  });

  it('detects refusal responses for empty context (FR-RAG-CITE-004)', () => {
    expect(sourceCitationService.isRefusalResponse(NO_RELEVANT_MEETINGS_MESSAGE)).toBe(true);
    expect(sourceCitationService.resolveRefusalReason(NO_RELEVANT_MEETINGS_MESSAGE, true)).toBe(
      'empty_context',
    );
  });
});
