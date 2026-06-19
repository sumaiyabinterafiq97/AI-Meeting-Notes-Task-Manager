import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

interface SummarySectionProps {
  summary: string | null;
  topics: string[];
  processedAt: string | null;
  modelVersion: string | null;
}

export function SummarySection({
  summary,
  topics,
  processedAt,
  modelVersion,
}: SummarySectionProps) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        No summary available yet. AI insights will appear after processing completes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
        {(processedAt || modelVersion) && (
          <p className="text-xs text-muted-foreground">
            {processedAt && `Generated ${formatDateTime(processedAt)}`}
            {processedAt && modelVersion && ' · '}
            {modelVersion && `Model ${modelVersion}`}
          </p>
        )}
      </div>

      {topics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key topics</h4>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
