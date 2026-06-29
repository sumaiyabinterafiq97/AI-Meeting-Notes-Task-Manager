import type { WeeklyReportSection } from '../../../../src/modules/agents/weekly-report/types/weekly-report.types';
import { normalizeWeeklyReportOutputForMerge } from '../../../../src/modules/agents/services/output-normalizer.service';

describe('weekly-report output normalizer', () => {
  it('strips section citations for merge', () => {
    const output = normalizeWeeklyReportOutputForMerge({
      title: 'Weekly Intelligence Report',
      sections: [
        {
          heading: 'Achievements',
          content: 'Shipped auth MVP [CITATION-1]',
          meetingIds: ['00000000-0000-0000-0000-000000000001'],
          citations: [{ index: 1, chunkId: 'chunk-1', meetingId: '00000000-0000-0000-0000-000000000001' }],
        } satisfies WeeklyReportSection,
      ],
      taskStats: { created: 5, completed: 3, open: 2, overdue: 0 },
      meetingCount: 2,
      citationCount: 1,
    });

    expect(output.sections[0]).toEqual({
      heading: 'Achievements',
      content: 'Shipped auth MVP [CITATION-1]',
      meetingIds: ['00000000-0000-0000-0000-000000000001'],
    });
  });
});
