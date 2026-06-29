import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import type {
  Risk,
  RiskAnalyzerInput,
  RiskAnalyzerOutput,
  RiskAnalyzerValidationResult,
  RiskLikelihood,
  RiskSeverity,
} from '../types/risk-analyzer.types';
import {
  DEFAULT_RISK_RECOMMENDATION,
  MAX_RISKS,
  RESOLVED_RISK_PATTERNS,
  RISK_CONFIDENCE_THRESHOLD,
  RISK_EVIDENCE_LENGTH,
  VALID_LIKELIHOODS,
  VALID_SEVERITIES,
  WEAK_RISK_PATTERNS,
} from './risk-analyzer.constants';

const SPEAKER_LINE = /^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/;

function normalizeRiskText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeSeverity(value: RiskSeverity | string | undefined): RiskSeverity {
  if (value && VALID_SEVERITIES.includes(value as RiskSeverity)) {
    return value as RiskSeverity;
  }
  return 'medium';
}

function normalizeLikelihood(value: RiskLikelihood | string | undefined): RiskLikelihood {
  if (value && VALID_LIKELIHOODS.includes(value as RiskLikelihood)) {
    return value as RiskLikelihood;
  }
  return 'unknown';
}

export function validateRiskAnalyzerOutput(risks: Risk[]): RiskAnalyzerValidationResult {
  const resolvedRiskCandidates: string[] = [];

  for (const risk of risks) {
    if (
      RESOLVED_RISK_PATTERNS.some(
        (pattern) => pattern.test(risk.text) || pattern.test(risk.context),
      )
    ) {
      resolvedRiskCandidates.push(risk.text);
    }
  }

  const weakRisks = risks.filter((risk) =>
    WEAK_RISK_PATTERNS.some(
      (pattern) => pattern.test(risk.text) || pattern.test(risk.context),
    ),
  );

  const warnings: string[] = [];
  if (resolvedRiskCandidates.length > 0) {
    warnings.push('Some risks may already be resolved based on language patterns.');
  }
  if (weakRisks.length > 0) {
    warnings.push('Some items may be casual comments rather than project risks.');
  }

  return {
    valid: resolvedRiskCandidates.length === 0,
    warnings,
    resolvedRiskCandidates,
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

export function extractRiskEvidence(riskText: string, transcript: string): string {
  if (isTranscriptEmpty(transcript)) {
    return '';
  }

  const keywords = riskText
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);
  const query = keywords.join(' ').toLowerCase();

  const lines = parseTranscriptLines(transcript);
  for (const line of lines) {
    if (line.text.toLowerCase().includes(query)) {
      const prefix = line.speaker ? `${line.speaker}: ` : '';
      return `${prefix}${line.text}`.slice(0, RISK_EVIDENCE_LENGTH);
    }
  }

  for (const keyword of keywords) {
    for (const line of lines) {
      if (line.text.toLowerCase().includes(keyword.toLowerCase())) {
        const prefix = line.speaker ? `${line.speaker}: ` : '';
        return `${prefix}${line.text}`.slice(0, RISK_EVIDENCE_LENGTH);
      }
    }
  }

  return '';
}

export function deduplicateRisks(risks: Risk[]): Risk[] {
  const seen = new Set<string>();
  const result: Risk[] = [];

  for (const risk of risks) {
    const key = normalizeRiskText(risk.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(risk);
  }

  return result.slice(0, MAX_RISKS);
}

function passesConfidenceGate(risk: Risk): boolean {
  if (risk.confidenceScore === undefined) {
    return true;
  }
  return risk.confidenceScore >= RISK_CONFIDENCE_THRESHOLD;
}

function normalizeRawRisk(risk: Risk, input: RiskAnalyzerInput): Risk {
  const evidence =
    risk.evidence?.trim() || extractRiskEvidence(risk.text, input.transcript);
  const recommendation = risk.recommendation?.trim() || DEFAULT_RISK_RECOMMENDATION;

  return {
    text: risk.text.trim().slice(0, 500),
    severity: normalizeSeverity(risk.severity),
    context: risk.context.trim().slice(0, 1000),
    impact: risk.impact?.trim().slice(0, 500) || undefined,
    likelihood: normalizeLikelihood(risk.likelihood),
    recommendation: recommendation.slice(0, 500),
    evidence: evidence || undefined,
    confidenceScore: risk.confidenceScore,
  };
}

function computeAverageConfidence(risks: Risk[]): number {
  if (risks.length === 0) return 1;

  const scored = risks.filter((risk) => risk.confidenceScore !== undefined);
  if (scored.length === 0) return 0.8;

  const total = scored.reduce((sum, risk) => sum + (risk.confidenceScore ?? 0), 0);
  return Number((total / scored.length).toFixed(2));
}

export function enrichRiskAnalyzerOutput(
  raw: RiskAnalyzerOutput,
  input: RiskAnalyzerInput,
): RiskAnalyzerOutput {
  const rawCount = raw.risks.length;

  const normalized = raw.risks.map((risk) => normalizeRawRisk(risk, input));
  const deduped = deduplicateRisks(normalized);
  const filtered = deduped.filter(passesConfidenceGate);

  validateRiskAnalyzerOutput(filtered);

  return {
    risks: filtered,
    filteredCount: rawCount - filtered.length,
    averageConfidence: computeAverageConfidence(filtered),
  };
}

export function buildEmptyTranscriptRiskOutput(): RiskAnalyzerOutput {
  return {
    risks: [],
    filteredCount: 0,
    averageConfidence: 1,
  };
}

export function stripRiskAnalyzerForMerge(output: RiskAnalyzerOutput): RiskAnalyzerOutput {
  return {
    risks: output.risks.map(({ text, severity, context }) => ({ text, severity, context })),
  };
}
