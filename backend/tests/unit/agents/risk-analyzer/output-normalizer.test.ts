import type { Risk } from '../../../../src/modules/agents/risk-analyzer/types/risk-analyzer.types';
import { normalizeRiskAnalyzerOutputForMerge } from '../../../../src/modules/agents/services/output-normalizer.service';

describe('risk-analyzer output normalizer', () => {
  it('strips v2.1 fields for merge', () => {
    const output = normalizeRiskAnalyzerOutputForMerge({
      risks: [
        {
          text: 'Vendor API integration may slip.',
          severity: 'medium',
          context: 'Vendor response time uncertain.',
          impact: 'Integration delay',
          likelihood: 'medium',
          recommendation: 'Escalate vendor',
          evidence: 'Vendor response time uncertain',
          confidenceScore: 0.82,
        } satisfies Risk,
      ],
      filteredCount: 0,
      averageConfidence: 0.82,
    });

    expect(output.risks[0]).toEqual({
      text: 'Vendor API integration may slip.',
      severity: 'medium',
      context: 'Vendor response time uncertain.',
    });
  });
});
