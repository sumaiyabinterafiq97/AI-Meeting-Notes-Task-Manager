import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { ReportStatusBadge } from './ReportSectionList';
import type { WorkspaceReport } from '../types/report.types';

interface ReportCardProps {
  workspaceId: string;
  report: WorkspaceReport;
}

export function ReportCard({ workspaceId, report }: ReportCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">
            <Link
              to={ROUTES.REPORT_DETAIL(workspaceId, report.id)}
              className="hover:underline"
            >
              {report.title}
            </Link>
          </CardTitle>
          <CardDescription>
            {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
          </CardDescription>
        </div>
        <ReportStatusBadge status={report.status} />
      </CardHeader>
      <CardContent>
        {report.status === 'COMPLETED' && report.contentMarkdown && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {report.contentMarkdown.replace(/^#+\s+/gm, '').slice(0, 240)}
          </p>
        )}
        {report.status === 'FAILED' && (
          <p className="text-sm text-red-700">{report.contentMarkdown || 'Generation failed.'}</p>
        )}
        {report.status === 'PENDING' && (
          <p className="text-sm text-muted-foreground">Report generation in progress…</p>
        )}
      </CardContent>
    </Card>
  );
}
