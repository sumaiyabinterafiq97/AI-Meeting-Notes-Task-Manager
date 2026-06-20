import type { Decision } from '../../../../src/modules/agents/decision/types/decision.types';
import { normalizeDecisionOutputForMerge } from '../../../../src/modules/agents/services/output-normalizer.service';

describe('decision output normalizer', () => {
  it('strips v2.1 fields for merge', () => {
    const output = normalizeDecisionOutputForMerge({
      decisions: [
        {
          text: 'Delay product launch to April 15.',
          context: 'Team reached consensus after debate.',
          stakeholders: ['Maria', 'Tom'],
          confidenceScore: 0.95,
          supportingEvidence: 'we agreed to delay launch to April 15',
        } satisfies Decision,
      ],
      filteredCount: 0,
      averageConfidence: 0.95,
    });

    expect(output.decisions[0]).toEqual({
      text: 'Delay product launch to April 15.',
      context: 'Team reached consensus after debate.',
    });
  });
});
