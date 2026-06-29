import type { KnowledgeEntryResult } from '../../../../src/modules/agents/knowledge/types/knowledge.types';
import { normalizeKnowledgeOutputForMerge } from '../../../../src/modules/agents/services/output-normalizer.service';

describe('knowledge output normalizer', () => {
  it('strips v2.1 fields for merge', () => {
    const output = normalizeKnowledgeOutputForMerge({
      entries: [
        {
          entityType: 'definition',
          title: 'RTO',
          content: 'Maximum 4 hours for production database restore.',
          confidence: 0.9,
          sourceRef: {
            meetingId: '00000000-0000-0000-0000-000000000002',
            excerpt: 'RTO as a maximum of 4 hours',
            timestamp: null,
          },
        } satisfies KnowledgeEntryResult,
      ],
      filteredCount: 0,
      averageConfidence: 0.9,
    });

    expect(output.entries[0]).toEqual({
      entityType: 'definition',
      title: 'RTO',
      content: 'Maximum 4 hours for production database restore.',
      confidence: 0.9,
    });
  });
});
