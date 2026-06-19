import type { WeeklyReportContent } from '../types/report.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseWeeklyReportContent(value: unknown): WeeklyReportContent | null {
  if (!isRecord(value)) {
    return null;
  }

  const sections = Array.isArray(value.sections)
    ? value.sections
        .filter(isRecord)
        .map((section) => ({
          heading: String(section.heading ?? ''),
          content: String(section.content ?? ''),
          meetingIds: Array.isArray(section.meetingIds)
            ? section.meetingIds.map((id) => String(id))
            : undefined,
        }))
        .filter((section) => section.heading.length > 0)
    : [];

  const taskStats = isRecord(value.taskStats)
    ? Object.fromEntries(
        Object.entries(value.taskStats).map(([key, stat]) => [key, Number(stat) || 0]),
      )
    : {};

  return {
    title: String(value.title ?? 'Weekly Report'),
    sections,
    taskStats,
    meetingCount: Number(value.meetingCount) || 0,
  };
}
