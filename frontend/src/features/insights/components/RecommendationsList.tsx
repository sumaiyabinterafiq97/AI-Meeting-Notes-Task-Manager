import { InsightCard } from '@/components/ai/InsightCard';
import type { MeetingRecommendation } from '../types/insights.types';

interface RecommendationsListProps {
  recommendations: MeetingRecommendation[];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No follow-up recommendations for this meeting right now.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {recommendations.map((item) => (
        <li key={item.id}>
          <InsightCard
            title={item.title}
            description={item.description}
            severity={item.priority === 'high' ? 'high' : item.priority === 'medium' ? 'medium' : 'low'}
            badge="Recommendation"
          />
        </li>
      ))}
    </ul>
  );
}
