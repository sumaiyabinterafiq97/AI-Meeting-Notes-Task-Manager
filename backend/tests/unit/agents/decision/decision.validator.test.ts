import type { Decision } from '../../../../src/modules/agents/decision/types/decision.types';
import {
  resolveStakeholder,
  resolveStakeholders,
  deduplicateDecisions,
  extractDecisionEvidence,
  enrichDecisionOutput,
  buildEmptyTranscriptDecisionOutput,
} from '../../../../src/modules/agents/decision/services/decision.validator';

describe('decision validator', () => {
  const sampleInput = {
    transcript: [
      'Maria: After debate, we agreed to delay the launch to April 15.',
      'Tom: I support that decision.',
      'Alex: Should we revisit the mobile app scope next quarter?',
    ].join('\n'),
    memberNames: ['Maria', 'Tom', 'Alex'],
    meetingDate: '2026-06-15',
  };

  it('resolves exact and partial stakeholder names', () => {
    expect(resolveStakeholder('Maria', sampleInput.memberNames)).toBe('Maria');
    expect(resolveStakeholder('tom', sampleInput.memberNames)).toBe('Tom');
    expect(resolveStakeholder('Unknown Person', sampleInput.memberNames)).toBeNull();
  });

  it('resolves stakeholder arrays against member list', () => {
    expect(resolveStakeholders(['Maria', 'Ghost'], sampleInput.memberNames)).toEqual(['Maria']);
    expect(resolveStakeholders(undefined, sampleInput.memberNames)).toEqual([]);
  });

  it('deduplicates decisions by normalized text', () => {
    const decisions: Decision[] = [
      {
        text: 'Delay launch to April 15',
        context: 'First',
      },
      {
        text: 'Delay launch to April 15.',
        context: 'Duplicate',
      },
    ];

    expect(deduplicateDecisions(decisions)).toHaveLength(1);
  });

  it('extracts supporting evidence from transcript', () => {
    const evidence = extractDecisionEvidence(
      'Delay launch to April 15',
      sampleInput.transcript,
    );
    expect(evidence).toContain('Maria');
    expect(evidence.toLowerCase()).toContain('april');
  });

  it('filters low-confidence decisions during enrichment', () => {
    const enriched = enrichDecisionOutput(
      {
        decisions: [
          {
            text: 'Delay product launch to April 15.',
            context: 'Team reached consensus after debate.',
            stakeholders: ['Maria', 'Tom'],
            confidenceScore: 0.95,
          },
          {
            text: 'Maybe revisit mobile app scope.',
            context: 'Open discussion only.',
            stakeholders: [],
            confidenceScore: 0.45,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.decisions).toHaveLength(1);
    expect(enriched.decisions[0].text).toContain('April 15');
    expect(enriched.filteredCount).toBe(1);
    expect(enriched.averageConfidence).toBeGreaterThan(0.9);
  });

  it('clears invalid stakeholders not in member list', () => {
    const enriched = enrichDecisionOutput(
      {
        decisions: [
          {
            text: 'Proceed with vendor contract.',
            context: 'Approved after review.',
            stakeholders: ['Ghost User'],
            confidenceScore: 0.85,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.decisions[0].stakeholders).toEqual([]);
  });

  it('returns empty output for empty transcript helper', () => {
    const output = buildEmptyTranscriptDecisionOutput();
    expect(output.decisions).toEqual([]);
    expect(output.averageConfidence).toBe(1);
  });
});
