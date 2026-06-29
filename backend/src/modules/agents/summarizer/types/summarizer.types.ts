export interface SummarizerInput {
  transcript: string;
  meetingTitle: string;
  memberNames: string[];
  meetingDate: string;
  durationMinutes?: number | null;
  agenda?: string | null;
  tags?: string[];
}

export interface SummarizerCitation {
  index: number;
  excerpt: string;
  speaker?: string;
  claimText?: string;
}

/** Canonical summarizer output — v2.0 merge fields plus optional v2.1 extensions. */
export interface SummarizerOutput {
  summary: string;
  keyTopics: string[];
  nextSteps?: string[];
  participantsDiscussed?: string[];
  citations?: SummarizerCitation[];
  confidenceScore?: number;
  durationMinutes?: number | null;
}

export interface SummarizerValidationResult {
  valid: boolean;
  warnings: string[];
  scopeViolations: string[];
}
