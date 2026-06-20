import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import { isSchemaV21Enabled } from '../../schemas/schema-resolver';
import type {
  KnowledgeEntryResult,
  KnowledgeInput,
  KnowledgeOutput,
  KnowledgeSourceRef,
  KnowledgeValidationResult,
} from '../types/knowledge.types';
import {
  KNOWLEDGE_CONFIDENCE_THRESHOLD,
  KNOWLEDGE_CONTENT_MAX_LENGTH,
  KNOWLEDGE_EVIDENCE_LENGTH,
  KNOWLEDGE_TITLE_MAX_LENGTH,
  MAX_KNOWLEDGE_ENTRIES,
  VALID_KNOWLEDGE_ENTITY_TYPES,
  WEAK_KNOWLEDGE_PATTERNS,
} from './knowledge.constants';

const SPEAKER_LINE = /^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function clampConfidence(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) {
    return 0.8;
  }
  return Math.min(1, Math.max(0, value));
}

export function normalizeEntityType(
  entityType: string | undefined,
): KnowledgeEntryResult['entityType'] {
  if (
    entityType &&
    VALID_KNOWLEDGE_ENTITY_TYPES.includes(entityType as KnowledgeEntryResult['entityType'])
  ) {
    return entityType as KnowledgeEntryResult['entityType'];
  }
  return 'other';
}

export function validateKnowledgeOutput(entries: KnowledgeEntryResult[]): KnowledgeValidationResult {
  const weakEntries = entries.filter((entry) =>
    WEAK_KNOWLEDGE_PATTERNS.some(
      (pattern) => pattern.test(entry.title) || pattern.test(entry.content),
    ),
  );

  const warnings: string[] = [];
  if (weakEntries.length > 0) {
    warnings.push('Some entries may be transient or speculative rather than durable knowledge.');
  }

  return {
    valid: weakEntries.length === 0,
    warnings,
    weakEntryTitles: weakEntries.map((entry) => entry.title),
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

export function extractKnowledgeEvidence(
  title: string,
  content: string,
  transcript: string,
): string {
  if (isTranscriptEmpty(transcript)) {
    return content.trim().slice(0, KNOWLEDGE_EVIDENCE_LENGTH);
  }

  const keywords = [...title.split(/\s+/), ...content.split(/\s+/)]
    .filter((word) => word.length > 3)
    .slice(0, 6);
  const query = keywords.join(' ').toLowerCase();

  const lines = parseTranscriptLines(transcript);
  for (const line of lines) {
    if (line.text.toLowerCase().includes(query)) {
      const prefix = line.speaker ? `${line.speaker}: ` : '';
      return `${prefix}${line.text}`.slice(0, KNOWLEDGE_EVIDENCE_LENGTH);
    }
  }

  for (const keyword of keywords) {
    for (const line of lines) {
      if (line.text.toLowerCase().includes(keyword.toLowerCase())) {
        const prefix = line.speaker ? `${line.speaker}: ` : '';
        return `${prefix}${line.text}`.slice(0, KNOWLEDGE_EVIDENCE_LENGTH);
      }
    }
  }

  return content.trim().slice(0, KNOWLEDGE_EVIDENCE_LENGTH);
}

export function resolveSourceRef(
  entry: KnowledgeEntryResult,
  input: KnowledgeInput,
): KnowledgeSourceRef {
  const excerpt =
    entry.sourceRef?.excerpt?.trim() ||
    extractKnowledgeEvidence(entry.title, entry.content, input.transcript);

  return {
    meetingId: input.meetingId,
    excerpt: excerpt.slice(0, KNOWLEDGE_EVIDENCE_LENGTH),
    timestamp: entry.sourceRef?.timestamp ?? null,
  };
}

export function deduplicateKnowledgeEntries(entries: KnowledgeEntryResult[]): KnowledgeEntryResult[] {
  const seen = new Set<string>();
  const result: KnowledgeEntryResult[] = [];

  for (const entry of entries) {
    const key = normalizeTitle(entry.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }

  return result.slice(0, MAX_KNOWLEDGE_ENTRIES);
}

function passesConfidenceGate(entry: KnowledgeEntryResult): boolean {
  return entry.confidence >= KNOWLEDGE_CONFIDENCE_THRESHOLD;
}

function normalizeRawEntry(entry: KnowledgeEntryResult, input: KnowledgeInput): KnowledgeEntryResult {
  const normalized: KnowledgeEntryResult = {
    entityType: normalizeEntityType(entry.entityType),
    title: entry.title.trim().slice(0, KNOWLEDGE_TITLE_MAX_LENGTH),
    content: entry.content.trim().slice(0, KNOWLEDGE_CONTENT_MAX_LENGTH),
    confidence: clampConfidence(entry.confidence),
  };

  if (isSchemaV21Enabled()) {
    normalized.sourceRef = resolveSourceRef(
      { ...normalized, sourceRef: entry.sourceRef },
      input,
    );
  }

  return normalized;
}

function computeAverageConfidence(entries: KnowledgeEntryResult[]): number {
  if (entries.length === 0) return 1;

  const total = entries.reduce((sum, entry) => sum + entry.confidence, 0);
  return Number((total / entries.length).toFixed(2));
}

export function enrichKnowledgeOutput(
  raw: KnowledgeOutput,
  input: KnowledgeInput,
): KnowledgeOutput {
  const rawCount = raw.entries.length;

  const normalized = raw.entries.map((entry) => normalizeRawEntry(entry, input));
  const deduped = deduplicateKnowledgeEntries(normalized);
  const filtered = deduped.filter(passesConfidenceGate);

  validateKnowledgeOutput(filtered);

  return {
    entries: filtered,
    filteredCount: rawCount - filtered.length,
    averageConfidence: computeAverageConfidence(filtered),
  };
}

export function buildEmptyTranscriptKnowledgeOutput(): KnowledgeOutput {
  return {
    entries: [],
    filteredCount: 0,
    averageConfidence: 1,
  };
}

export function stripKnowledgeForMerge(output: KnowledgeOutput): KnowledgeOutput {
  return {
    entries: output.entries.map(({ entityType, title, content, confidence }) => ({
      entityType,
      title,
      content,
      confidence,
    })),
  };
}
