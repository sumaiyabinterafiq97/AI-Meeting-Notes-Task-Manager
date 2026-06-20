import {
  normalizeTaskExtractorOutput,
  normalizeDecisionOutput,
  normalizeRiskAnalyzerOutput,
} from '../../../src/modules/agents/services/output-normalizer.service';

describe('output normalizer (v2.1)', () => {
  const v21 = { useV21: true };

  it('filters low-confidence tasks', () => {
    const result = normalizeTaskExtractorOutput(
      {
        actionItems: [
          {
            title: 'Keep',
            description: 'High confidence',
            suggestedAssignee: 'Alex',
            suggestedDueDate: '2026-06-20',
            priority: 'high',
            dependencies: [],
            confidenceScore: 0.9,
          },
          {
            title: 'Drop',
            description: 'Low confidence',
            suggestedAssignee: null,
            suggestedDueDate: null,
            priority: 'low',
            dependencies: [],
            confidenceScore: 0.5,
          },
        ],
      },
      v21,
    );

    expect(result.actionItems).toHaveLength(1);
    expect(result.actionItems[0].title).toBe('Keep');
  });

  it('filters low-confidence decisions', () => {
    const result = normalizeDecisionOutput(
      {
        decisions: [
          {
            text: 'Approved budget',
            context: 'Explicit vote',
            stakeholders: ['CFO'],
            confidenceScore: 0.95,
            supportingEvidence: 'We approved the budget.',
          },
          {
            text: 'Maybe defer',
            context: 'Informal',
            stakeholders: [],
            confidenceScore: 0.55,
            supportingEvidence: 'Someone mentioned maybe.',
          },
        ],
      },
      v21,
    );

    expect(result.decisions).toHaveLength(1);
  });

  it('strips v2.1 risk extensions for merge compatibility', () => {
    const result = normalizeRiskAnalyzerOutput(
      {
        risks: [
          {
            text: 'Vendor delay',
            severity: 'high',
            context: 'API slip',
            impact: 'Launch blocked',
            likelihood: 'high',
            recommendation: 'Escalate vendor',
            evidence: 'Vendor silent 2 weeks',
            confidenceScore: 0.88,
          },
        ],
      },
      v21,
    );

    expect(result.risks[0]).toEqual({
      text: 'Vendor delay',
      severity: 'high',
      context: 'API slip',
    });
  });
});
