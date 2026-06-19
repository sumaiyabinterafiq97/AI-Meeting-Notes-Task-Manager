import type { InsightSeverity } from '@/components/ai/InsightCard';

export interface MeetingDecision {
  text: string;
  context: string;
}

export interface MeetingRisk {
  text: string;
  severity: InsightSeverity;
  context: string;
}

export interface MeetingRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export type { KnowledgeEntityType, KnowledgeEntry } from '@/features/knowledge/types/knowledge.types';

export interface MeetingInsightsData {
  summary: string | null;
  topics: string[];
  decisions: MeetingDecision[];
  risks: MeetingRisk[];
  recommendations: MeetingRecommendation[];
  processedAt: string | null;
  modelVersion: string | null;
}
