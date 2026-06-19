import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useGenerateReport } from '../hooks/useGenerateReport';
import type { ReportListFilters } from '../types/report.types';

interface ReportGeneratePanelProps {
  workspaceId: string;
  onGenerated: (reportId: string) => void;
}

function defaultDateRange(): ReportListFilters {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 6);
  return {
    dateFrom: periodStart.toISOString().slice(0, 10),
    dateTo: periodEnd.toISOString().slice(0, 10),
  };
}

export function ReportGeneratePanel({ workspaceId, onGenerated }: ReportGeneratePanelProps) {
  const [filters, setFilters] = useState<ReportListFilters>(defaultDateRange);
  const generateReport = useGenerateReport(workspaceId);

  const handleGenerate = async () => {
    const report = await generateReport.mutateAsync({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    onGenerated(report.id);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">Generate weekly report</h3>
            <p className="text-sm text-muted-foreground">
              AI synthesizes meetings, tasks, and risks for the selected period.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">From</span>
              <Input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">To</span>
              <Input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </label>
          </div>
        </div>

        <Button
          type="button"
          className="gap-2"
          onClick={() => void handleGenerate()}
          disabled={generateReport.isPending}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {generateReport.isPending ? 'Generating…' : 'Generate report'}
        </Button>
      </div>

      {generateReport.isError && (
        <div className="mt-4">
          <ErrorAlert
            message={getApiErrorMessage(generateReport.error, 'Failed to generate report')}
          />
        </div>
      )}
    </div>
  );
}
