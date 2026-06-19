import type {
  MeetingDecision,
  MeetingInsightsData,
  MeetingRecommendation,
  MeetingRisk,
} from '../types/insights.types';
import type { ActionItem, MeetingAiOutput } from '@/features/meetings/types/meeting.types';
import type { InsightSeverity } from '@/components/ai/InsightCard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSeverity(value: unknown): InsightSeverity {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'medium';
}

export function parseDecisions(value: unknown): MeetingDecision[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      text: String(item.text ?? '').trim(),
      context: String(item.context ?? '').trim(),
    }))
    .filter((item) => item.text.length > 0);
}

export function parseRisks(value: unknown): MeetingRisk[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      text: String(item.text ?? '').trim(),
      severity: parseSeverity(item.severity),
      context: String(item.context ?? '').trim(),
    }))
    .filter((item) => item.text.length > 0);
}

export function buildMeetingRecommendations(
  risks: MeetingRisk[],
  decisions: MeetingDecision[],
  actionItems: ActionItem[],
): MeetingRecommendation[] {
  const recommendations: MeetingRecommendation[] = [];

  for (const risk of risks) {
    if (risk.severity === 'high' || risk.severity === 'medium') {
      recommendations.push({
        id: `risk-${risk.text.slice(0, 40)}`,
        title: 'Mitigate identified risk',
        description: risk.text,
        priority: risk.severity === 'high' ? 'high' : 'medium',
      });
    }
  }

  const pendingActions = actionItems.filter((item) => item.status === 'PENDING');
  if (pendingActions.length > 0) {
    recommendations.push({
      id: 'pending-actions',
      title: 'Review pending action items',
      description: `${pendingActions.length} extracted follow-up${pendingActions.length === 1 ? '' : 's'} still need acceptance or rejection.`,
      priority: 'medium',
    });
  }

  for (const decision of decisions.slice(0, 3)) {
    recommendations.push({
      id: `decision-${decision.text.slice(0, 40)}`,
      title: 'Share decision with stakeholders',
      description: decision.text,
      priority: 'low',
    });
  }

  const seen = new Set<string>();
  return recommendations.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function parseMeetingInsights(
  aiOutput: MeetingAiOutput | null | undefined,
  actionItems: ActionItem[],
): MeetingInsightsData {
  const decisions = parseDecisions(aiOutput?.decisions);
  const risks = parseRisks(aiOutput?.risks);

  return {
    summary: aiOutput?.summary ?? null,
    topics: aiOutput?.topics ?? [],
    decisions,
    risks,
    recommendations: buildMeetingRecommendations(risks, decisions, actionItems),
    processedAt: aiOutput?.processedAt ?? null,
    modelVersion: aiOutput?.modelVersion ?? null,
  };
}
