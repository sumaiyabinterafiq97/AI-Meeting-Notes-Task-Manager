import type { Risk } from '../../../../src/modules/agents/risk-analyzer/types/risk-analyzer.types';
import {
  deduplicateRisks,
  extractRiskEvidence,
  enrichRiskAnalyzerOutput,
  buildEmptyTranscriptRiskOutput,
} from '../../../../src/modules/agents/risk-analyzer/services/risk-analyzer.validator';
import { DEFAULT_RISK_RECOMMENDATION } from '../../../../src/modules/agents/risk-analyzer/services/risk-analyzer.constants';

describe('risk-analyzer validator', () => {
  const sampleInput = {
    transcript: [
      'Jordan: We cannot launch without SOC 2 and the audit will not finish until August.',
      'Alex: The vendor API response time is still uncertain — that could slip our integration.',
      'Maria: We fixed the database migration issue last week.',
    ].join('\n'),
    summary: 'Team discussed launch blockers.',
    decisions: [{ text: 'Delay launch to August', context: 'Audit dependency' }],
  };

  it('deduplicates risks by normalized text', () => {
    const risks: Risk[] = [
      {
        text: 'SOC 2 audit may block launch',
        severity: 'high',
        context: 'First',
      },
      {
        text: 'SOC 2 audit may block launch.',
        severity: 'high',
        context: 'Duplicate',
      },
    ];

    expect(deduplicateRisks(risks)).toHaveLength(1);
  });

  it('extracts supporting evidence from transcript', () => {
    const evidence = extractRiskEvidence('SOC 2 audit block launch', sampleInput.transcript);
    expect(evidence).toContain('Jordan');
    expect(evidence.toLowerCase()).toContain('soc');
  });

  it('filters low-confidence risks during enrichment', () => {
    const enriched = enrichRiskAnalyzerOutput(
      {
        risks: [
          {
            text: 'SOC 2 audit will block August launch.',
            severity: 'high',
            context: 'Compliance dependency identified in meeting.',
            impact: 'Revenue delay in Q3',
            likelihood: 'high',
            recommendation: 'Start audit prep immediately',
            confidenceScore: 0.9,
          },
          {
            text: 'Maybe the weather will affect the offsite.',
            severity: 'low',
            context: 'Casual comment.',
            confidenceScore: 0.5,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.risks).toHaveLength(1);
    expect(enriched.risks[0].text).toContain('SOC 2');
    expect(enriched.filteredCount).toBe(1);
    expect(enriched.averageConfidence).toBeGreaterThan(0.85);
  });

  it('defaults recommendation to Monitor when missing', () => {
    const enriched = enrichRiskAnalyzerOutput(
      {
        risks: [
          {
            text: 'Vendor API integration may slip.',
            severity: 'medium',
            context: 'Vendor response time uncertain.',
            confidenceScore: 0.8,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.risks[0].recommendation).toBe(DEFAULT_RISK_RECOMMENDATION);
    expect(enriched.risks[0].likelihood).toBe('unknown');
  });

  it('returns empty output for empty transcript helper', () => {
    const output = buildEmptyTranscriptRiskOutput();
    expect(output.risks).toEqual([]);
    expect(output.averageConfidence).toBe(1);
  });
});
