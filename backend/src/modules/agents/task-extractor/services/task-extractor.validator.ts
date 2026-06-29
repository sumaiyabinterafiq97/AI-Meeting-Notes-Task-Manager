import type { ActionItem, TaskExtractorInput, TaskExtractorOutput, TaskExtractorValidationResult } from '../types/task-extractor.types';
import {
  EVIDENCE_EXCERPT_LENGTH,
  MAX_ACTION_ITEMS,
  TASK_CONFIDENCE_THRESHOLD,
  WEAK_COMMITMENT_PATTERNS,
} from './task-extractor.constants';

import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';

const SPEAKER_LINE = /^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function resolveAssignee(
  suggested: string | null | undefined,
  memberNames: string[],
): string | null {
  if (!suggested?.trim()) {
    return null;
  }

  const normalized = suggested.toLowerCase().trim();
  const exact = memberNames.find((name) => name.toLowerCase() === normalized);
  if (exact) {
    return exact;
  }

  const partial = memberNames.find(
    (name) =>
      name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase()),
  );

  return partial ?? null;
}

export function validateTaskExtractorOutput(
  items: ActionItem[],
  memberNames: string[],
): TaskExtractorValidationResult {
  const invalidAssignees: string[] = [];

  for (const item of items) {
    if (!item.suggestedAssignee) continue;
    const resolved = resolveAssignee(item.suggestedAssignee, memberNames);
    if (item.suggestedAssignee && !resolved) {
      invalidAssignees.push(item.suggestedAssignee);
    }
  }

  const weakCommitments = items.filter((item) =>
    WEAK_COMMITMENT_PATTERNS.some(
      (pattern) => pattern.test(item.title) || pattern.test(item.description),
    ),
  );

  const warnings: string[] = [];
  if (invalidAssignees.length > 0) {
    warnings.push('Some assignees were not found in workspace members and were cleared.');
  }
  if (weakCommitments.length > 0) {
    warnings.push('Some items may be weak commitments based on language patterns.');
  }

  return {
    valid: invalidAssignees.length === 0,
    warnings,
    invalidAssignees,
  };
}

function parseTranscriptLines(transcript: string): Array<{ speaker?: string; text: string }> {
  return transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(SPEAKER_LINE);
      if (match) {
        return { speaker: match[1].trim(), text: match[2].trim() };
      }
      return { text: line };
    });
}

export function extractSupportingEvidence(title: string, transcript: string): string {
  if (isTranscriptEmpty(transcript)) {
    return '';
  }

  const keywords = title
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);
  const query = keywords.join(' ').toLowerCase();

  const lines = parseTranscriptLines(transcript);
  for (const line of lines) {
    if (line.text.toLowerCase().includes(query)) {
      const prefix = line.speaker ? `${line.speaker}: ` : '';
      return `${prefix}${line.text}`.slice(0, EVIDENCE_EXCERPT_LENGTH);
    }
  }

  for (const keyword of keywords) {
    for (const line of lines) {
      if (line.text.toLowerCase().includes(keyword.toLowerCase())) {
        const prefix = line.speaker ? `${line.speaker}: ` : '';
        return `${prefix}${line.text}`.slice(0, EVIDENCE_EXCERPT_LENGTH);
      }
    }
  }

  return '';
}

export function deduplicateActionItems(items: ActionItem[]): ActionItem[] {
  const seen = new Set<string>();
  const result: ActionItem[] = [];

  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result.slice(0, MAX_ACTION_ITEMS);
}

function passesConfidenceGate(item: ActionItem): boolean {
  if (item.confidenceScore === undefined) {
    return true;
  }
  return item.confidenceScore >= TASK_CONFIDENCE_THRESHOLD;
}

function normalizeRawItem(item: ActionItem, input: TaskExtractorInput): ActionItem {
  const assignee = resolveAssignee(item.suggestedAssignee, input.memberNames);
  const evidence =
    'supportingEvidence' in item && item.supportingEvidence
      ? item.supportingEvidence
      : extractSupportingEvidence(item.title, input.transcript);

  return {
    title: item.title.trim().slice(0, 300),
    description: item.description.trim().slice(0, 1000),
    suggestedAssignee: assignee,
    suggestedDueDate: item.suggestedDueDate,
    priority: 'priority' in item ? item.priority : undefined,
    dependencies: 'dependencies' in item ? item.dependencies ?? [] : [],
    confidenceScore: 'confidenceScore' in item ? item.confidenceScore : undefined,
    supportingEvidence: evidence || undefined,
  };
}

function computeAverageConfidence(items: ActionItem[]): number {
  if (items.length === 0) return 1;

  const scored = items.filter((item) => item.confidenceScore !== undefined);
  if (scored.length === 0) return 0.8;

  const total = scored.reduce((sum, item) => sum + (item.confidenceScore ?? 0), 0);
  return Number((total / scored.length).toFixed(2));
}

export function enrichTaskExtractorOutput(
  raw: TaskExtractorOutput,
  input: TaskExtractorInput,
): TaskExtractorOutput {
  const rawCount = raw.actionItems.length;

  const normalized = raw.actionItems.map((item) => normalizeRawItem(item, input));
  const deduped = deduplicateActionItems(normalized);
  const filtered = deduped.filter(passesConfidenceGate);

  validateTaskExtractorOutput(filtered, input.memberNames);

  return {
    actionItems: filtered,
    filteredCount: rawCount - filtered.length,
    averageConfidence: computeAverageConfidence(filtered),
  };
}

export function buildEmptyTranscriptTaskOutput(): TaskExtractorOutput {
  return {
    actionItems: [],
    filteredCount: 0,
    averageConfidence: 1,
  };
}

export function stripTaskExtractorForMerge(output: TaskExtractorOutput): TaskExtractorOutput {
  return {
    actionItems: output.actionItems.map(
      ({ title, description, suggestedAssignee, suggestedDueDate }) => ({
        title,
        description,
        suggestedAssignee,
        suggestedDueDate,
      }),
    ),
  };
}
