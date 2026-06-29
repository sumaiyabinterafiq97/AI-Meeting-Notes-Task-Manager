export interface DecisionInput {
  transcript: string;
  summary?: string;
  memberNames: string[];
  meetingDate?: string;
}

export interface Decision {
  text: string;
  context: string;
  stakeholders?: string[];
  confidenceScore?: number;
  supportingEvidence?: string;
}

/** Canonical decision output — v2.0 merge fields plus optional v2.1 extensions. */
export interface DecisionOutput {
  decisions: Decision[];
  filteredCount?: number;
  averageConfidence?: number;
}

export interface DecisionValidationResult {
  valid: boolean;
  warnings: string[];
  invalidStakeholders: string[];
}
