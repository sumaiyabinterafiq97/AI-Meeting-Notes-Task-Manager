import { citationParserService } from '../../../rag/services/citation-parser.service';
import type { ContextBlock } from '../../../rag/types/rag.types';
import type {
  WeeklyReportContext,
  WeeklyReportOutput,
  WeeklyReportSection,
  WeeklyReportValidationResult,
} from '../types/weekly-report.types';
import {
  EXPECTED_SECTION_HEADINGS,
  FALLBACK_WEEKLY_REPORT_OUTPUT,
  isValidMeetingId,
  LOW_ACTIVITY_SECTION_CONTENT,
  MAX_SECTIONS,
} from './weekly-report.constants';

function normalizeHeading(heading: string): string {
  return heading.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function buildDefaultTitle(context: Pick<WeeklyReportContext, 'workspaceName' | 'meetingCount'>, dateFrom: string, dateTo: string): string {
  const workspace = context.workspaceName?.trim() || 'Workspace';
  return `Weekly Intelligence Report — ${workspace} (${dateFrom} to ${dateTo})`;
}

function filterMeetingIds(meetingIds: string[] | undefined): string[] {
  if (!meetingIds?.length) {
    return [];
  }

  return [...new Set(meetingIds.filter(isValidMeetingId))];
}

function resolveSectionCitations(
  section: WeeklyReportSection,
  contextBlocks: ContextBlock[],
): WeeklyReportSection['citations'] {
  if (section.citations?.length) {
    return section.citations.map((citation) => ({
      index: citation.index,
      chunkId: citation.chunkId,
      meetingId: citation.meetingId && isValidMeetingId(citation.meetingId) ? citation.meetingId : undefined,
    }));
  }

  if (contextBlocks.length === 0) {
    return undefined;
  }

  return citationParserService.mapCitations(section.content, contextBlocks).map((citation) => ({
    index: citation.index,
    chunkId: citation.chunkId,
    meetingId: citation.meetingId,
  }));
}

export function validateWeeklyReportOutput(
  output: WeeklyReportOutput,
  contextBlocks: ContextBlock[] = [],
): WeeklyReportValidationResult {
  const invalidMeetingIds: string[] = [];
  const orphanCitationIndices: number[] = [];
  const validIndices = new Set(contextBlocks.map((block) => block.citationIndex));

  for (const section of output.sections) {
    for (const meetingId of section.meetingIds ?? []) {
      if (!isValidMeetingId(meetingId)) {
        invalidMeetingIds.push(meetingId);
      }
    }

    for (const citation of section.citations ?? []) {
      if (contextBlocks.length > 0 && !validIndices.has(citation.index)) {
        orphanCitationIndices.push(citation.index);
      }
    }
  }

  const warnings: string[] = [];
  if (invalidMeetingIds.length > 0) {
    warnings.push('Some meeting IDs were invalid and were removed from sections.');
  }
  if (orphanCitationIndices.length > 0) {
    warnings.push('Some citation indices did not match retrieved context blocks.');
  }

  const missingHeadings = EXPECTED_SECTION_HEADINGS.filter(
    (expected) =>
      !output.sections.some((section) => normalizeHeading(section.heading) === normalizeHeading(expected)),
  );
  if (missingHeadings.length > 0) {
    warnings.push(`Report is missing recommended sections: ${missingHeadings.join(', ')}.`);
  }

  return {
    valid: invalidMeetingIds.length === 0 && orphanCitationIndices.length === 0,
    warnings,
    invalidMeetingIds,
    orphanCitationIndices,
  };
}

export function deduplicateSections(sections: WeeklyReportSection[]): WeeklyReportSection[] {
  const seen = new Set<string>();
  const result: WeeklyReportSection[] = [];

  for (const section of sections) {
    const key = normalizeHeading(section.heading);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(section);
  }

  return result.slice(0, MAX_SECTIONS);
}

function normalizeSection(
  section: WeeklyReportSection,
  contextBlocks: ContextBlock[],
): WeeklyReportSection {
  const citations = resolveSectionCitations(section, contextBlocks);

  return {
    heading: section.heading.trim().slice(0, 120) || 'Summary',
    content: section.content.trim(),
    meetingIds: filterMeetingIds(section.meetingIds),
    citations: citations?.length ? citations : undefined,
  };
}

function countCitations(sections: WeeklyReportSection[]): number {
  return sections.reduce((total, section) => total + (section.citations?.length ?? 0), 0);
}

export interface WeeklyReportEnrichmentContext extends WeeklyReportContext {
  dateFrom: string;
  dateTo: string;
  contextBlocks?: ContextBlock[];
}

export function enrichWeeklyReportOutput(
  raw: WeeklyReportOutput,
  context: WeeklyReportEnrichmentContext,
): WeeklyReportOutput {
  const contextBlocks = context.contextBlocks ?? [];
  const normalized = raw.sections.map((section) => normalizeSection(section, contextBlocks));
  const deduped = deduplicateSections(normalized);

  const output: WeeklyReportOutput = {
    title: raw.title?.trim() || buildDefaultTitle(context, context.dateFrom, context.dateTo),
    sections: deduped.length > 0 ? deduped : FALLBACK_WEEKLY_REPORT_OUTPUT.sections,
    taskStats: context.taskStats,
    meetingCount: context.meetingCount,
    citationCount: countCitations(deduped),
  };

  validateWeeklyReportOutput(output, contextBlocks);
  return output;
}

export function buildLowActivityWeeklyReportOutput(
  context: WeeklyReportEnrichmentContext,
): WeeklyReportOutput {
  return {
    title: buildDefaultTitle(context, context.dateFrom, context.dateTo),
    sections: [
      {
        heading: 'Summary',
        content: LOW_ACTIVITY_SECTION_CONTENT,
      },
      {
        heading: 'Metrics',
        content: [
          `- Meetings held: ${context.meetingCount}`,
          `- Tasks created: ${context.taskStats.created ?? 0}`,
          `- Tasks completed: ${context.taskStats.completed ?? 0}`,
          `- Open tasks: ${context.taskStats.open ?? 0}`,
        ].join('\n'),
      },
    ],
    taskStats: context.taskStats,
    meetingCount: context.meetingCount,
    citationCount: 0,
  };
}

export function stripWeeklyReportForMerge(output: WeeklyReportOutput): WeeklyReportOutput {
  return {
    title: output.title,
    sections: output.sections.map(({ heading, content, meetingIds }) => ({
      heading,
      content,
      meetingIds,
    })),
    taskStats: output.taskStats,
    meetingCount: output.meetingCount,
  };
}
