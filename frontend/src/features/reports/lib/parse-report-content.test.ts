import { describe, it, expect } from 'vitest';
import { parseWeeklyReportContent } from './parse-report-content';

describe('parse-report-content', () => {
  it('parses weekly report JSON sections and stats', () => {
    const parsed = parseWeeklyReportContent({
      title: 'Weekly Report',
      sections: [{ heading: 'Summary', content: 'Good week.' }],
      taskStats: { created: 5, completed: 3, open: 2 },
      meetingCount: 4,
    });

    expect(parsed?.title).toBe('Weekly Report');
    expect(parsed?.sections).toHaveLength(1);
    expect(parsed?.taskStats.completed).toBe(3);
    expect(parsed?.meetingCount).toBe(4);
  });
});
