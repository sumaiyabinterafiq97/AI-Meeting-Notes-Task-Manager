import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { InsightCard } from '@/components/ai/InsightCard';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useDashboardInsights } from '../hooks/useDashboardInsights';

interface AiInsightsCardProps {
  workspaceId: string;
}

const insightSeverity = {
  anomaly: 'high',
  recommendation: 'medium',
  trend: 'low',
} as const;

export function AiInsightsCard({ workspaceId }: AiInsightsCardProps) {
  const { data, isLoading, isError, error } = useDashboardInsights(workspaceId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <CardTitle>Productivity Insights</CardTitle>
        </div>
        <CardDescription>Workspace trends and AI-generated narrative.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Loading insights" />
          </div>
        )}

        {isError && (
          <ErrorAlert message={getApiErrorMessage(error, 'Failed to load workspace insights')} />
        )}

        {data && (
          <>
            {data.narrative && (
              <p className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                {data.narrative}
              </p>
            )}

            {data.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No insights available yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.insights.slice(0, 4).map((insight) => (
                  <InsightCard
                    key={insight.id}
                    title={insight.title}
                    description={insight.description}
                    badge={insight.type}
                    severity={insightSeverity[insight.type]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
