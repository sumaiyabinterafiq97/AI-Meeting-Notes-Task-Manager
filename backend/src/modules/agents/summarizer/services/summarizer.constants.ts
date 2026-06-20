export const EMPTY_TRANSCRIPT_SUMMARY =
  'No transcript content was available to summarize.';

export const EMPTY_TRANSCRIPT_OUTPUT = {
  summary: EMPTY_TRANSCRIPT_SUMMARY,
  keyTopics: [] as string[],
  nextSteps: [] as string[],
  participantsDiscussed: [] as string[],
  citations: [] as never[],
  confidenceScore: 1,
};

export const FALLBACK_SUMMARIZER_OUTPUT = {
  summary: 'Summary generation failed. Other meeting insights may still be available.',
  keyTopics: [] as string[],
  confidenceScore: 0,
};

/** Patterns that suggest scope leakage into summary (action items / decisions / risks). */
export const SUMMARY_SCOPE_VIOLATION_PATTERNS = [
  /\baction item(s)?\b/i,
  /\bassigned to\b/i,
  /\bwill (complete|deliver|follow up|send|update)\b/i,
  /\bwe decided\b/i,
  /\bagreed to (proceed|ship|approve|delay|launch)\b/i,
  /\bapproved the\b/i,
  /\brisk(s)? (is|are|of|that)\b/i,
  /\bblocker(s)?\b/i,
  /\bseverity:\s*(low|medium|high)\b/i,
] as const;

export const MAX_CITATIONS = 5;
export const CITATION_EXCERPT_LENGTH = 200;

export {
  AGENT_MAX_TRANSCRIPT_CHARS as SUMMARIZER_MAX_TRANSCRIPT_CHARS,
  AGENT_TRUNCATED_TRANSCRIPT_CHARS as SUMMARIZER_TRUNCATED_TRANSCRIPT_CHARS,
} from '../../shared/transcript.utils';
