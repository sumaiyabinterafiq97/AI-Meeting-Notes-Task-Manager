export const MAX_SECTIONS = 10;
export const EXPECTED_SECTION_HEADINGS = [
  'Summary',
  'Achievements',
  'Pending Work',
  'Risks',
  'Recommendations',
  'Metrics',
] as const;

export const FALLBACK_WEEKLY_REPORT_OUTPUT = {
  title: 'Weekly Intelligence Report',
  sections: [
    {
      heading: 'Summary',
      content: 'Report generation failed. Please retry or check workspace activity data.',
    },
  ],
  taskStats: { created: 0, completed: 0, open: 0, overdue: 0 },
  meetingCount: 0,
  citationCount: 0,
};

export const LOW_ACTIVITY_SECTION_CONTENT =
  'No meetings were recorded during this reporting period. Task metrics are included below where available.';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidMeetingId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
