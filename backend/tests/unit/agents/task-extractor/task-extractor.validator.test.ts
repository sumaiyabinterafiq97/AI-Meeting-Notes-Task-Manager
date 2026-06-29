import type { ActionItem } from '../../../../src/modules/agents/task-extractor/types/task-extractor.types';
import {
  resolveAssignee,
  deduplicateActionItems,
  extractSupportingEvidence,
  enrichTaskExtractorOutput,
  buildEmptyTranscriptTaskOutput,
} from '../../../../src/modules/agents/task-extractor/services/task-extractor.validator';

describe('task-extractor validator', () => {
  const sampleInput = {
    transcript: [
      'Sarah: I will draft the migration plan by Wednesday.',
      'Jordan: I will review it once Sarah sends the draft.',
      'Alex: It might be nice to add dark mode someday.',
    ].join('\n'),
    memberNames: ['Sarah', 'Jordan', 'Alex'],
    meetingDate: '2026-06-15',
  };

  it('resolves exact and partial assignee names', () => {
    expect(resolveAssignee('Sarah', sampleInput.memberNames)).toBe('Sarah');
    expect(resolveAssignee('sarah', sampleInput.memberNames)).toBe('Sarah');
    expect(resolveAssignee('Unknown Person', sampleInput.memberNames)).toBeNull();
  });

  it('deduplicates action items by normalized title', () => {
    const items: ActionItem[] = [
      {
        title: 'Draft migration plan',
        description: 'First',
        suggestedAssignee: 'Sarah',
        suggestedDueDate: null,
      },
      {
        title: 'Draft Migration Plan.',
        description: 'Duplicate',
        suggestedAssignee: 'Sarah',
        suggestedDueDate: null,
      },
    ];

    expect(deduplicateActionItems(items)).toHaveLength(1);
  });

  it('extracts supporting evidence from transcript', () => {
    const evidence = extractSupportingEvidence('Draft migration plan', sampleInput.transcript);
    expect(evidence).toContain('Sarah');
    expect(evidence.toLowerCase()).toContain('migration');
  });

  it('filters low-confidence items during enrichment', () => {
    const enriched = enrichTaskExtractorOutput(
      {
        actionItems: [
          {
            title: 'Ship auth fix',
            description: 'Alex committed to shipping the fix.',
            suggestedAssignee: 'Alex',
            suggestedDueDate: '2026-06-25',
            confidenceScore: 0.95,
          },
          {
            title: 'Maybe add dark mode',
            description: 'Casual suggestion only.',
            suggestedAssignee: null,
            suggestedDueDate: null,
            confidenceScore: 0.55,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.actionItems).toHaveLength(1);
    expect(enriched.actionItems[0].title).toBe('Ship auth fix');
    expect(enriched.filteredCount).toBe(1);
    expect(enriched.averageConfidence).toBeGreaterThan(0.9);
  });

  it('clears invalid assignees not in member list', () => {
    const enriched = enrichTaskExtractorOutput(
      {
        actionItems: [
          {
            title: 'Update runbook',
            description: 'Needs owner validation.',
            suggestedAssignee: 'Ghost User',
            suggestedDueDate: null,
            confidenceScore: 0.8,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.actionItems[0].suggestedAssignee).toBeNull();
  });

  it('returns empty output for empty transcript helper', () => {
    const output = buildEmptyTranscriptTaskOutput();
    expect(output.actionItems).toEqual([]);
    expect(output.averageConfidence).toBe(1);
  });
});
