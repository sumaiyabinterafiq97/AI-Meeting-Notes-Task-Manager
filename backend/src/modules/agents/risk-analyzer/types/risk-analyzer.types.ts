export interface RiskAnalyzerInput {
  transcript: string;
  summary?: string;
  decisions?: Array<{ text: string; context: string }>;
  tags?: string[];
  meetingDate?: string;
}

export type RiskSeverity = 'low' | 'medium' | 'high';
export type RiskLikelihood = 'low' | 'medium' | 'high' | 'unknown';

export interface Risk {
  text: string;
  severity: RiskSeverity;
  context: string;
  impact?: string;
  likelihood?: RiskLikelihood;
  recommendation?: string;
  evidence?: string;
  confidenceScore?: number;
}

/** Canonical risk analyzer output — v2.0 merge fields plus optional v2.1 extensions. */
export interface RiskAnalyzerOutput {
  risks: Risk[];
  filteredCount?: number;
  averageConfidence?: number;
}

export interface RiskAnalyzerValidationResult {
  valid: boolean;
  warnings: string[];
  resolvedRiskCandidates: string[];
}
