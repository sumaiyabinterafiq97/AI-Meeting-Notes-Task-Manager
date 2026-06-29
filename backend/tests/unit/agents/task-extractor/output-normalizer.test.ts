import type { ActionItem } from '../../../../src/modules/agents/task-extractor/types/task-extractor.types';
import { normalizeTaskExtractorOutputForMerge } from '../../../../src/modules/agents/services/output-normalizer.service';

describe('task-extractor output normalizer', () => {
  it('strips v2.1 fields for merge when schema v2.1 enabled', () => {
    const output = normalizeTaskExtractorOutputForMerge({
      actionItems: [
        {
          title: 'Ship auth fix',
          description: 'Alex committed.',
          suggestedAssignee: 'Alex',
          suggestedDueDate: '2026-06-25',
          priority: 'high',
          dependencies: ['Vendor API'],
          confidenceScore: 0.95,
          supportingEvidence: 'Alex: I will ship the auth fix.',
        } satisfies ActionItem,
      ],
      filteredCount: 0,
      averageConfidence: 0.95,
    });

    expect(output.actionItems[0]).toEqual({
      title: 'Ship auth fix',
      description: 'Alex committed.',
      suggestedAssignee: 'Alex',
      suggestedDueDate: '2026-06-25',
    });
  });
});
