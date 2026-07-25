import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants';

interface InsightsTeaserProps {
  workspaceId: string;
  recommendationCount: number;
}

export function InsightsTeaser({ workspaceId, recommendationCount }: InsightsTeaserProps) {
  const hasRecommendations = recommendationCount > 0;
  const label = hasRecommendations
    ? `${recommendationCount} recommendation${recommendationCount === 1 ? '' : 's'} available`
    : 'Explore workspace intelligence';

  const description = hasRecommendations
    ? 'View recommendations, risks, and decisions on Insights.'
    : 'Open Insights for workspace pulse, risks, and decision history.';

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium leading-none">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Link
          to={ROUTES.INSIGHTS(workspaceId)}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View Insights
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
