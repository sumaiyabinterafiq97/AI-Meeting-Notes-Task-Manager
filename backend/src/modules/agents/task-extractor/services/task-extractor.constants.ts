export const TASK_CONFIDENCE_THRESHOLD = 0.7;
export const MAX_ACTION_ITEMS = 20;
export const EVIDENCE_EXCERPT_LENGTH = 300;

export const FALLBACK_TASK_EXTRACTOR_OUTPUT = {
  actionItems: [] as never[],
  filteredCount: 0,
  averageConfidence: 0,
};

export const EMPTY_TRANSCRIPT_TASK_OUTPUT = {
  actionItems: [] as never[],
  filteredCount: 0,
  averageConfidence: 1,
};

/** Weak-commitment phrases — used to warn on possible false positives. */
export const WEAK_COMMITMENT_PATTERNS = [
  /\bmight\b/i,
  /\bmaybe\b/i,
  /\bcould\b/i,
  /\bshould think about\b/i,
  /\bnice to have\b/i,
  /\bsomeday\b/i,
] as const;
