import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import type {
  Decision,
  DecisionInput,
  DecisionOutput,
  DecisionValidationResult,
} from '../types/decision.types';
import {
  DECISION_CONFIDENCE_THRESHOLD,
  DECISION_EVIDENCE_LENGTH,
  MAX_DECISIONS,
  WEAK_DECISION_PATTERNS,
} from './decision.constants';

const SPEAKER_LINE = /^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/;

function normalizeDecisionText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function resolveStakeholder(
  suggested: string | null | undefined,
  memberNames: string[],
): string | null {
  if (!suggested?.trim()) {
    return null;
  }

  const normalized = suggested.toLowerCase().trim();
  const exact = memberNames.find((name) => name.toLowerCase() === normalized);
  if (exact) {
    return exact;
  }

  const partial = memberNames.find(
    (name) =>
      name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase()),
  );

  return partial ?? null;
}

export function resolveStakeholders(
  suggested: string[] | undefined,
  memberNames: string[],
): string[] {
  if (!suggested?.length) {
    return [];
  }

  const resolved = new Set<string>();
  for (const name of suggested) {
    const match = resolveStakeholder(name, memberNames);
    if (match) {
      resolved.add(match);
    }
  }

  return [...resolved];
}

export function validateDecisionOutput(
  decisions: Decision[],
  memberNames: string[],
): DecisionValidationResult {
  const invalidStakeholders: string[] = [];

  for (const decision of decisions) {
    if (!decision.stakeholders?.length) continue;
    for (const stakeholder of decision.stakeholders) {
      if (!resolveStakeholder(stakeholder, memberNames)) {
        invalidStakeholders.push(stakeholder);
      }
    }
  }

  const weakDecisions = decisions.filter((decision) =>
    WEAK_DECISION_PATTERNS.some(
      (pattern) => pattern.test(decision.text) || pattern.test(decision.context),
    ),
  );

  const warnings: string[] = [];
  if (invalidStakeholders.length > 0) {
    warnings.push('Some stakeholders were not found in workspace members and were cleared.');
  }
  if (weakDecisions.length > 0) {
    warnings.push('Some decisions may be open discussion rather than closed agreements.');
  }

  return {
    valid: invalidStakeholders.length === 0,
    warnings,
    invalidStakeholders,
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

export function extractDecisionEvidence(decisionText: string, transcript: string): string {
  if (isTranscriptEmpty(transcript)) {
    return '';
  }

  const keywords = decisionText
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);
  const query = keywords.join(' ').toLowerCase();

  const lines = parseTranscriptLines(transcript);
  for (const line of lines) {
    if (line.text.toLowerCase().includes(query)) {
      const prefix = line.speaker ? `${line.speaker}: ` : '';
      return `${prefix}${line.text}`.slice(0, DECISION_EVIDENCE_LENGTH);
    }
  }

  for (const keyword of keywords) {
    for (const line of lines) {
      if (line.text.toLowerCase().includes(keyword.toLowerCase())) {
        const prefix = line.speaker ? `${line.speaker}: ` : '';
        return `${prefix}${line.text}`.slice(0, DECISION_EVIDENCE_LENGTH);
      }
    }
  }

  return '';
}

export function deduplicateDecisions(decisions: Decision[]): Decision[] {
  const seen = new Set<string>();
  const result: Decision[] = [];

  for (const decision of decisions) {
    const key = normalizeDecisionText(decision.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(decision);
  }

  return result.slice(0, MAX_DECISIONS);
}

function passesConfidenceGate(decision: Decision): boolean {
  if (decision.confidenceScore === undefined) {
    return true;
  }
  return decision.confidenceScore >= DECISION_CONFIDENCE_THRESHOLD;
}

function normalizeRawDecision(decision: Decision, input: DecisionInput): Decision {
  const stakeholders = resolveStakeholders(decision.stakeholders, input.memberNames);
  const evidence =
    decision.supportingEvidence?.trim() ||
    extractDecisionEvidence(decision.text, input.transcript);

  return {
    text: decision.text.trim().slice(0, 500),
    context: decision.context.trim().slice(0, 1000),
    stakeholders,
    confidenceScore: decision.confidenceScore,
    supportingEvidence: evidence || undefined,
  };
}

function computeAverageConfidence(decisions: Decision[]): number {
  if (decisions.length === 0) return 1;

  const scored = decisions.filter((decision) => decision.confidenceScore !== undefined);
  if (scored.length === 0) return 0.8;

  const total = scored.reduce((sum, decision) => sum + (decision.confidenceScore ?? 0), 0);
  return Number((total / scored.length).toFixed(2));
}

export function enrichDecisionOutput(
  raw: DecisionOutput,
  input: DecisionInput,
): DecisionOutput {
  const rawCount = raw.decisions.length;

  const normalized = raw.decisions.map((decision) => normalizeRawDecision(decision, input));
  const deduped = deduplicateDecisions(normalized);
  const filtered = deduped.filter(passesConfidenceGate);

  validateDecisionOutput(filtered, input.memberNames);

  return {
    decisions: filtered,
    filteredCount: rawCount - filtered.length,
    averageConfidence: computeAverageConfidence(filtered),
  };
}

export function buildEmptyTranscriptDecisionOutput(): DecisionOutput {
  return {
    decisions: [],
    filteredCount: 0,
    averageConfidence: 1,
  };
}

export function stripDecisionForMerge(output: DecisionOutput): DecisionOutput {
  return {
    decisions: output.decisions.map(({ text, context }) => ({ text, context })),
  };
}
