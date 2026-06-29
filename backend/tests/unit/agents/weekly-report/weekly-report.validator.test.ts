import type { ContextBlock } from '../../../../src/modules/rag/types/rag.types';
import type { WeeklyReportSection } from '../../../../src/modules/agents/weekly-report/types/weekly-report.types';
import {
  deduplicateSections,
  enrichWeeklyReportOutput,
  buildLowActivityWeeklyReportOutput,
  validateWeeklyReportOutput,
  stripWeeklyReportForMerge,
} from '../../../../src/modules/agents/weekly-report/services/weekly-report.validator';
import { isValidMeetingId } from '../../../../src/modules/agents/weekly-report/services/weekly-report.constants';

describe('weekly-report validator', () => {
  const enrichmentContext = {
    dateFrom: '2026-06-09',
    dateTo: '2026-06-15',
    workspaceName: 'Acme Team',
    meetingSummaries: '- Sprint planning (2026-06-10): Shipped auth MVP',
    taskStats: { created: 5, completed: 3, open: 2, overdue: 1 },
    openRisks: '- [medium] Vendor API may slip',
    meetingCount: 2,
  };

  const contextBlocks: ContextBlock[] = [
    {
      citationIndex: 1,
      chunkId: '00000000-0000-0000-0000-000000000011',
      content: 'Shipped authentication MVP ahead of schedule.',
      meetingId: '00000000-0000-0000-0000-000000000001',
      meetingTitle: 'Sprint Planning',
      metadata: {},
    },
  ];

  it('validates meeting IDs and citation indices', () => {
    const result = validateWeeklyReportOutput(
      {
        title: 'Weekly Report',
        sections: [
          {
            heading: 'Achievements',
            content: 'Shipped auth MVP [CITATION-1]',
            meetingIds: ['not-a-uuid'],
            citations: [{ index: 1 }, { index: 99 }],
          },
        ],
        taskStats: enrichmentContext.taskStats,
        meetingCount: 2,
      },
      contextBlocks,
    );

    expect(result.invalidMeetingIds).toContain('not-a-uuid');
    expect(result.orphanCitationIndices).toContain(99);
  });

  it('deduplicates sections by normalized heading', () => {
    const sections: WeeklyReportSection[] = [
      { heading: 'Summary', content: 'First' },
      { heading: 'summary', content: 'Duplicate' },
    ];

    expect(deduplicateSections(sections)).toHaveLength(1);
  });

  it('enriches output with authoritative stats and resolved citations', () => {
    const enriched = enrichWeeklyReportOutput(
      {
        title: '',
        sections: [
          {
            heading: 'Achievements',
            content: 'Shipped authentication MVP [CITATION-1]',
          },
          {
            heading: 'Summary',
            content: 'Productive week overall.',
          },
        ],
        taskStats: { created: 99, completed: 0, open: 0 },
        meetingCount: 99,
      },
      { ...enrichmentContext, contextBlocks },
    );

    expect(enriched.title).toContain('Acme Team');
    expect(enriched.taskStats).toEqual(enrichmentContext.taskStats);
    expect(enriched.meetingCount).toBe(2);
    expect(enriched.sections[0].citations?.[0].index).toBe(1);
    expect(enriched.citationCount).toBeGreaterThan(0);
    expect(enriched.sections[0].meetingIds).toEqual([]);
  });

  it('builds low-activity report without LLM content', () => {
    const output = buildLowActivityWeeklyReportOutput({
      ...enrichmentContext,
      meetingCount: 0,
      taskStats: { created: 0, completed: 0, open: 0, overdue: 0 },
    });

    expect(output.meetingCount).toBe(0);
    expect(output.sections[0].heading).toBe('Summary');
    expect(output.citationCount).toBe(0);
  });

  it('strips v2.1 section citations for merge', () => {
    const stripped = stripWeeklyReportForMerge({
      title: 'Weekly Report',
      sections: [
        {
          heading: 'Achievements',
          content: 'Shipped auth MVP [CITATION-1]',
          meetingIds: ['00000000-0000-0000-0000-000000000001'],
          citations: [{ index: 1, chunkId: 'chunk-1' }],
        },
      ],
      taskStats: enrichmentContext.taskStats,
      meetingCount: 2,
      citationCount: 1,
    });

    expect(stripped.sections[0].citations).toBeUndefined();
    expect(stripped.citationCount).toBeUndefined();
  });

  it('accepts valid UUID meeting IDs', () => {
    expect(isValidMeetingId('00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(isValidMeetingId('invalid')).toBe(false);
  });
});
