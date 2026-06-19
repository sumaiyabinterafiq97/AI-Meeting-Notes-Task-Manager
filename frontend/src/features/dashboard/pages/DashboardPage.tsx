import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useDashboard } from '../hooks/useDashboard';
import { StatsGrid } from '../components/StatsGrid';
import { AiMetricsGrid } from '../components/AiMetricsGrid';
import { RecommendationsRow } from '../components/RecommendationsRow';
import { RecentMeetingsStrip } from '../components/RecentMeetingsStrip';
import { TasksDueSoon } from '../components/TasksDueSoon';
import { AiInsightsCard } from '../components/AiInsightsCard';
import { ProductivityChart } from '../components/ProductivityChart';
import { ActivityFeed } from '../components/ActivityFeed';

export function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data, isLoading, isError, error } = useDashboard(workspaceId);

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading dashboard" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorAlert message={getApiErrorMessage(error, 'Failed to load dashboard')} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h2>
        <p className="text-muted-foreground">
          AI-powered overview of meetings, tasks, and workspace productivity.
        </p>
      </div>

      <StatsGrid stats={data.stats} />
      <AiMetricsGrid metrics={data.aiMetrics} />

      <RecommendationsRow workspaceId={workspaceId} recommendations={data.recommendations} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentMeetingsStrip workspaceId={workspaceId} meetings={data.recentMeetings} />
        <TasksDueSoon workspaceId={workspaceId} tasks={data.tasksDueSoon} />
      </div>

      <AiInsightsCard workspaceId={workspaceId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProductivityChart
          weeks={data.productivity.tasksCompletedPerWeek}
          avgDaysToComplete={data.productivity.avgDaysToComplete}
        />
        <ActivityFeed workspaceId={workspaceId} activities={data.recentActivity} />
      </div>
    </div>
  );
}
