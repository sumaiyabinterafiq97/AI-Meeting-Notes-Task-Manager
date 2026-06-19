import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useReport } from '../hooks/useReport';
import { useGenerateReport } from '../hooks/useGenerateReport';
import { parseWeeklyReportContent } from '../lib/parse-report-content';
import { ReportExportMenu } from '../components/ReportExportMenu';
import { ReportMetricsChart } from '../components/ReportMetricsChart';
import { ReportSectionList, ReportStatusBadge } from '../components/ReportSectionList';

export function ReportDetailPage() {
  const { workspaceId, reportId } = useParams<{ workspaceId: string; reportId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, isError, error } = useReport(workspaceId, reportId);
  const generateReport = useGenerateReport(workspaceId);

  if (!workspaceId || !reportId) {
    return <ErrorAlert message="Report not found" />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading report" />
      </div>
    );
  }

  if (isError || !report) {
    return <ErrorAlert message={getApiErrorMessage(error, 'Failed to load report')} />;
  }

  const parsedContent = parseWeeklyReportContent(report.contentJson);

  const handleRegenerate = async () => {
    const regenerated = await generateReport.mutateAsync({
      dateFrom: report.periodStart.slice(0, 10),
      dateTo: report.periodEnd.slice(0, 10),
    });
    navigate(ROUTES.REPORT_DETAIL(workspaceId, regenerated.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
            <Link to={ROUTES.REPORTS(workspaceId)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to reports
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{report.title}</h2>
            <ReportStatusBadge status={report.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
            {report.generatedAt && ` · Generated ${formatDateTime(report.generatedAt)}`}
          </p>
          {report.modelVersion && (
            <p className="text-xs text-muted-foreground">
              Model {report.modelVersion}
              {report.promptTokens != null && report.completionTokens != null && (
                <> · {report.promptTokens + report.completionTokens} tokens</>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ReportExportMenu report={report} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={generateReport.isPending}
            onClick={() => void handleRegenerate()}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Regenerate
          </Button>
        </div>
      </div>

      {generateReport.isError && (
        <ErrorAlert message={getApiErrorMessage(generateReport.error, 'Failed to regenerate report')} />
      )}

      {report.status === 'FAILED' && (
        <ErrorAlert message={report.contentMarkdown || 'Report generation failed.'} />
      )}

      {parsedContent && report.status === 'COMPLETED' && (
        <ReportMetricsChart
          taskStats={parsedContent.taskStats}
          meetingCount={parsedContent.meetingCount}
        />
      )}

      {parsedContent && <ReportSectionList sections={parsedContent.sections} />}

      {report.status === 'COMPLETED' && report.contentMarkdown && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Full report</h3>
          <MarkdownRenderer content={report.contentMarkdown} />
        </div>
      )}
    </div>
  );
}
