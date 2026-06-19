import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadReportMarkdown } from '../lib/export-report';
import type { WorkspaceReport } from '../types/report.types';

interface ReportExportMenuProps {
  report: WorkspaceReport;
}

export function ReportExportMenu({ report }: ReportExportMenuProps) {
  if (report.status !== 'COMPLETED' || !report.contentMarkdown) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => downloadReportMarkdown(report)}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Export Markdown
    </Button>
  );
}
