import { Badge } from '@/components/ui/badge';
import { InsightCard } from '@/components/ai/InsightCard';
import type { WeeklyReportSection } from '../types/report.types';

interface ReportSectionListProps {
  sections: WeeklyReportSection[];
}

export function ReportSectionList({ sections }: ReportSectionListProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Report sections</h3>
      <div className="grid gap-3">
        {sections.map((section) => (
          <InsightCard
            key={section.heading}
            title={section.heading}
            description={section.content}
            expandable
            defaultExpanded={sections.length <= 3}
          />
        ))}
      </div>
    </div>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED' ? 'secondary' : status === 'FAILED' ? 'outline' : 'default';

  return (
    <Badge variant={variant} className={status === 'FAILED' ? 'border-red-300 text-red-700' : undefined}>
      {status.toLowerCase()}
    </Badge>
  );
}
