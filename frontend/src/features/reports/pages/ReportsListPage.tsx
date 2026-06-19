import { useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { useReports } from '../hooks/useReports';
import { ReportCard } from '../components/ReportCard';
import { ReportGeneratePanel } from '../components/ReportGeneratePanel';

export function ReportsListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { data: reports = [], isLoading, isError, error } = useReports(workspaceId);

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h2>
        <p className="text-muted-foreground">
          AI-generated weekly intelligence reports for your workspace.
        </p>
      </div>

      <ReportGeneratePanel
        workspaceId={workspaceId}
        onGenerated={(reportId) => navigate(ROUTES.REPORT_DETAIL(workspaceId, reportId))}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading reports" />
        </div>
      )}

      {isError && <ErrorAlert message={getApiErrorMessage(error, 'Failed to load reports')} />}

      {!isLoading && !isError && reports.length === 0 && (
        <EmptyState
          title="No reports yet"
          description="Generate your first weekly report to see workspace insights here."
        />
      )}

      {!isLoading && !isError && reports.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <ReportCard key={report.id} workspaceId={workspaceId} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
