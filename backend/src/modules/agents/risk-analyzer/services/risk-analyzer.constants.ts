import type { RiskLikelihood, RiskSeverity } from '../types/risk-analyzer.types';

export const RISK_CONFIDENCE_THRESHOLD = 0.65;
export const MAX_RISKS = 10;
export const RISK_EVIDENCE_LENGTH = 500;
export const DEFAULT_RISK_RECOMMENDATION = 'Monitor';

export const FALLBACK_RISK_ANALYZER_OUTPUT = {
  risks: [] as never[],
  filteredCount: 0,
  averageConfidence: 0,
};

export const EMPTY_TRANSCRIPT_RISK_OUTPUT = {
  risks: [] as never[],
  filteredCount: 0,
  averageConfidence: 1,
};

export const VALID_SEVERITIES: RiskSeverity[] = ['low', 'medium', 'high'];
export const VALID_LIKELIHOODS: RiskLikelihood[] = ['low', 'medium', 'high', 'unknown'];

/** Phrases suggesting a risk may already be resolved — used for validation warnings. */
export const RESOLVED_RISK_PATTERNS = [
  /\bwe fixed\b/i,
  /\balready resolved\b/i,
  /\bno longer a (risk|concern|blocker)\b/i,
  /\bwas resolved\b/i,
] as const;

/** Casual/non-project phrasing — used to warn on possible false positives. */
export const WEAK_RISK_PATTERNS = [
  /\bi'?m tired\b/i,
  /\bnice weather\b/i,
  /\bjust venting\b/i,
] as const;
