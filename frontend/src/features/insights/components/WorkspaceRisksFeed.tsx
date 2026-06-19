import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightCard } from '@/components/ai/InsightCard';
import { ROUTES } from '@/lib/constants';
import type { DashboardRecommendation } from '@/features/dashboard/types/dashboard.types';

interface WorkspaceRisksFeedProps {
  workspaceId: string;
  recommendations: DashboardRecommendation[];
}

export function WorkspaceRisksFeed({ workspaceId, recommendations }: WorkspaceRisksFeedProps) {
  const risks = recommendations.filter((item) => item.type === 'risk');

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <CardTitle>Risks across meetings</CardTitle>
        </div>
        <CardDescription>High-signal blockers surfaced from recent meeting analysis.</CardDescription>
      </CardHeader>
      <CardContent>
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cross-meeting risks flagged right now.</p>
        ) : (
          <ul className="space-y-3">
            {risks.map((risk) => {
              const content = (
                <InsightCard
                  title={risk.title}
                  description={risk.description}
                  badge={risk.meetingTitle}
                  severity={risk.priority === 'high' ? 'high' : risk.priority === 'medium' ? 'medium' : 'low'}
                >
                  <Badge
                    variant="outline"
                    className={risk.priority === 'high' ? 'border-red-300 text-red-700' : undefined}
                  >
                    {risk.priority} priority
                  </Badge>
                </InsightCard>
              );

              if (!risk.meetingId) {
                return <li key={risk.id}>{content}</li>;
              }

              return (
                <li key={risk.id}>
                  <Link
                    to={ROUTES.MEETING_DETAIL(workspaceId, risk.meetingId)}
                    className="block rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
