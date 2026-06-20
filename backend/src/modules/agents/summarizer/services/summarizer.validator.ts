import type {
  SummarizerCitation,
  SummarizerInput,
  SummarizerOutput,
  SummarizerValidationResult,
} from '../types/summarizer.types';
import {
  CITATION_EXCERPT_LENGTH,
  EMPTY_TRANSCRIPT_SUMMARY,
  MAX_CITATIONS,
  SUMMARY_SCOPE_VIOLATION_PATTERNS,
} from './summarizer.constants';

const SPEAKER_LINE = /^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/;

export function isTranscriptEmpty(transcript: string): boolean {
  return transcript.trim().length === 0;
}

export function validateSummarizerScope(summary: string): SummarizerValidationResult {
  const scopeViolations = SUMMARY_SCOPE_VIOLATION_PATTERNS.filter((pattern) =>
    pattern.test(summary),
  ).map((pattern) => pattern.source);

  return {
    valid: scopeViolations.length === 0,
    warnings: scopeViolations.length
      ? ['Summary may contain content outside summarizer scope (tasks, decisions, or risks).']
      : [],
    scopeViolations,
  };
}

export function computeSummarizerConfidence(
  output: Pick<SummarizerOutput, 'summary' | 'keyTopics'>,
  transcript: string,
  scopeViolations: string[],
): number {
  if (output.summary === EMPTY_TRANSCRIPT_SUMMARY) {
    return 1;
  }

  const transcriptLength = transcript.trim().length;
  let score = 0.85;

  if (transcriptLength < 80) {
    score -= 0.15;
  }

  if (output.keyTopics.length === 0 && transcriptLength > 200) {
    score -= 0.2;
  }

  if (scopeViolations.length > 0) {
    score -= 0.1 * Math.min(scopeViolations.length, 3);
  }

  if (output.summary.length < 30 && transcriptLength > 100) {
    score -= 0.1;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
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

function buildExcerpt(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text.slice(0, CITATION_EXCERPT_LENGTH);
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function extractSummarizerCitations(
  output: Pick<SummarizerOutput, 'summary' | 'keyTopics'>,
  transcript: string,
): SummarizerCitation[] {
  if (isTranscriptEmpty(transcript)) {
    return [];
  }

  const lines = parseTranscriptLines(transcript);
  const citations: SummarizerCitation[] = [];
  const usedLineIndexes = new Set<number>();

  for (const topic of output.keyTopics.slice(0, MAX_CITATIONS)) {
    const topicWords = topic.split(/\s+/).filter((word) => word.length > 3);
    const query = topicWords[0] ?? topic;

    for (let i = 0; i < lines.length; i += 1) {
      if (usedLineIndexes.has(i)) continue;

      const line = lines[i];
      if (!line.text.toLowerCase().includes(query.toLowerCase())) continue;

      citations.push({
        index: citations.length + 1,
        excerpt: buildExcerpt(line.text, query).slice(0, CITATION_EXCERPT_LENGTH),
        speaker: line.speaker,
        claimText: topic,
      });
      usedLineIndexes.add(i);
      break;
    }

    if (citations.length >= MAX_CITATIONS) break;
  }

  if (citations.length === 0 && lines.length > 0) {
    const first = lines[0];
    citations.push({
      index: 1,
      excerpt: first.text.slice(0, CITATION_EXCERPT_LENGTH),
      speaker: first.speaker,
      claimText: output.keyTopics[0] ?? 'Opening discussion',
    });
  }

  return citations;
}

export function enrichSummarizerOutput(
  raw: SummarizerOutput,
  input: SummarizerInput,
): SummarizerOutput {
  const scope = validateSummarizerScope(raw.summary);
  const citations = extractSummarizerCitations(raw, input.transcript);
  const confidenceScore = computeSummarizerConfidence(
    raw,
    input.transcript,
    scope.scopeViolations,
  );

  return {
    summary: raw.summary,
    keyTopics: raw.keyTopics,
    nextSteps: raw.nextSteps ?? [],
    participantsDiscussed: raw.participantsDiscussed ?? [],
    citations,
    confidenceScore,
    durationMinutes: input.durationMinutes ?? null,
  };
}

export function buildEmptyTranscriptOutput(): SummarizerOutput {
  return {
    summary: EMPTY_TRANSCRIPT_SUMMARY,
    keyTopics: [],
    nextSteps: [],
    participantsDiscussed: [],
    citations: [],
    confidenceScore: 1,
  };
}
