import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { useDashboardInsights } from '@/features/dashboard/hooks/useDashboardInsights';
import { RecommendationsRow } from '@/features/dashboard/components/RecommendationsRow';
import { useKnowledgeEntries } from '@/features/knowledge/hooks/useKnowledgeEntries';
import { getDecisionTimelineEntries } from '@/features/knowledge/lib/knowledge-utils';
import { InsightsQuickLinks } from '../components/InsightsQuickLinks';
import { WorkspaceTrendsSection } from '../components/WorkspaceTrendsSection';
import { WorkspaceRisksFeed } from '../components/WorkspaceRisksFeed';
import { WorkspaceDecisionsFeed } from '../components/WorkspaceDecisionsFeed';

export function InsightsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
  } = useDashboard(workspaceId);

  const {
    data: workspaceInsights,
    isLoading: isInsightsLoading,
    isError: isInsightsError,
    error: insightsError,
  } = useDashboardInsights(workspaceId);

  const { data: knowledgeEntries = [], isLoading: isKnowledgeLoading } = useKnowledgeEntries(
    workspaceId,
    'DECISION',
  );

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  const decisionEntries = getDecisionTimelineEntries(knowledgeEntries);
  const isLoading = isDashboardLoading || isInsightsLoading || isKnowledgeLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading insights hub" />
      </div>
    );
  }

  if (isDashboardError || !dashboard) {
    return <ErrorAlert message={getApiErrorMessage(dashboardError, 'Failed to load insights')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Insights</h2>
          <p className="max-w-2xl text-muted-foreground">
            Workspace intelligence hub — recommendations, risks, decisions, and links to search your
            meeting memory.
          </p>
        </div>
        <InsightsQuickLinks workspaceId={workspaceId} />
      </div>

      <WorkspaceTrendsSection
        data={workspaceInsights}
        isLoading={isInsightsLoading}
        isError={isInsightsError}
        error={insightsError}
      />

      <RecommendationsRow workspaceId={workspaceId} recommendations={dashboard.recommendations} />

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceRisksFeed workspaceId={workspaceId} recommendations={dashboard.recommendations} />
        <WorkspaceDecisionsFeed workspaceId={workspaceId} entries={decisionEntries} />
      </div>
    </div>
  );
}
