export const DECISION_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_DECISIONS = 15;
export const DECISION_EVIDENCE_LENGTH = 500;

export const FALLBACK_DECISION_OUTPUT = {
  decisions: [] as never[],
  filteredCount: 0,
  averageConfidence: 0,
};

export const EMPTY_TRANSCRIPT_DECISION_OUTPUT = {
  decisions: [] as never[],
  filteredCount: 0,
  averageConfidence: 1,
};

/** Open-discussion phrases — used to warn on possible false positives. */
export const WEAK_DECISION_PATTERNS = [
  /\bshould we\b/i,
  /\bno conclusion\b/i,
  /\btable this\b/i,
  /\btake it offline\b/i,
  /\bstill discussing\b/i,
  /\bopen question\b/i,
] as const;
