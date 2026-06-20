import {
  SummarizerOutputSchemaV20,
  TaskExtractorOutputSchemaV20,
  DecisionOutputSchemaV20,
  RiskAnalyzerOutputSchemaV20,
  TaskExtractorOutputSchemaV21,
  DecisionOutputSchemaV21,
} from '../../../src/modules/agents/schemas/zod-schemas';

describe('agent Zod schemas', () => {
  it('validates v2.0 summarizer output', () => {
    const result = SummarizerOutputSchemaV20.safeParse({
      summary: 'Team aligned on launch timeline.',
      keyTopics: ['Launch', 'Dependencies'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects summarizer output missing required fields', () => {
    const result = SummarizerOutputSchemaV20.safeParse({ summary: 'Only summary' });
    expect(result.success).toBe(false);
  });

  it('validates v2.0 task extractor output', () => {
    const result = TaskExtractorOutputSchemaV20.safeParse({
      actionItems: [
        {
          title: 'Follow up with vendor',
          description: 'Confirm API delivery',
          suggestedAssignee: 'Alex',
          suggestedDueDate: '2026-06-20',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('validates v2.1 task extractor with confidence', () => {
    const result = TaskExtractorOutputSchemaV21.safeParse({
      actionItems: [
        {
          title: 'Update board',
          description: 'Reflect scope changes',
          suggestedAssignee: null,
          suggestedDueDate: null,
          priority: 'high',
          dependencies: ['Vendor API'],
          confidenceScore: 0.85,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid decision severity', () => {
    const result = DecisionOutputSchemaV20.safeParse({
      decisions: [{ text: 'Ship Friday', context: 'Consensus' }],
    });
    expect(result.success).toBe(true);

    const risk = RiskAnalyzerOutputSchemaV20.safeParse({
      risks: [{ text: 'Delay', severity: 'critical', context: 'Unknown' }],
    });
    expect(risk.success).toBe(false);
  });

  it('validates v2.1 decision with stakeholders and evidence', () => {
    const result = DecisionOutputSchemaV21.safeParse({
      decisions: [
        {
          text: 'Delay launch to April',
          context: 'Vendor blocker',
          stakeholders: ['Alice', 'Bob'],
          confidenceScore: 0.92,
          supportingEvidence: 'Alice: we agreed to push to April.',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
