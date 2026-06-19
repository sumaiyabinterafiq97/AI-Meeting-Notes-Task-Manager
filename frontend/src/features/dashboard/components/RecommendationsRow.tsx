import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants';
import { InsightCard } from '@/components/ai/InsightCard';
import type { DashboardRecommendation } from '../types/dashboard.types';

interface RecommendationsRowProps {
  workspaceId: string;
  recommendations: DashboardRecommendation[];
}

const priorityVariant: Record<DashboardRecommendation['priority'], 'default' | 'secondary' | 'outline'> = {
  high: 'outline',
  medium: 'default',
  low: 'secondary',
};

function getRecommendationLink(
  workspaceId: string,
  recommendation: DashboardRecommendation,
): string | null {
  if (recommendation.meetingId) {
    return ROUTES.MEETING_DETAIL(workspaceId, recommendation.meetingId);
  }
  if (recommendation.type === 'backlog') {
    return ROUTES.TASKS(workspaceId);
  }
  return null;
}

export function RecommendationsRow({ workspaceId, recommendations }: RecommendationsRowProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <CardTitle>Recommendations</CardTitle>
        </div>
        <CardDescription>AI-informed follow-ups based on meetings and tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No follow-up recommendations right now. Upload meeting transcripts to generate insights.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map((recommendation) => {
              const link = getRecommendationLink(workspaceId, recommendation);
              const content = (
                <InsightCard
                  title={recommendation.title}
                  description={recommendation.description}
                  badge={recommendation.meetingTitle}
                  severity={
                    recommendation.priority === 'high'
                      ? 'high'
                      : recommendation.priority === 'medium'
                        ? 'medium'
                        : 'low'
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant[recommendation.priority]} className={recommendation.priority === 'high' ? 'border-red-300 text-red-700' : undefined}>
                      {recommendation.priority} priority
                    </Badge>
                    {recommendation.meetingTitle && (
                      <span className="text-xs text-muted-foreground">{recommendation.meetingTitle}</span>
                    )}
                  </div>
                </InsightCard>
              );

              if (!link) {
                return (
                  <div key={recommendation.id}>{content}</div>
                );
              }

              return (
                <Link
                  key={recommendation.id}
                  to={link}
                  className="block rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
