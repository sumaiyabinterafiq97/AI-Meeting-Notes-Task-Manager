import { BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { InsightCard } from '@/components/ai/InsightCard';
import { Badge } from '@/components/ui/badge';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useMeetingKnowledge } from '../hooks/useMeetingKnowledge';
import { formatKnowledgeEntityType } from '@/features/knowledge/lib/knowledge-utils';
import type { KnowledgeEntityType } from '../types/insights.types';

interface KnowledgeLinksSectionProps {
  workspaceId: string;
  meetingId: string;
}

function formatEntityType(type: KnowledgeEntityType): string {
  return formatKnowledgeEntityType(type);
}

export function KnowledgeLinksSection({ workspaceId, meetingId }: KnowledgeLinksSectionProps) {
  const { data: entries = [], isLoading, isError, error } = useMeetingKnowledge(
    workspaceId,
    meetingId,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner label="Loading knowledge links" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorAlert message={getApiErrorMessage(error, 'Failed to load knowledge entries')} />
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          No knowledge entries linked to this meeting yet. Entries are created after AI processing
          when knowledge extraction is enabled.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <InsightCard
            title={entry.title}
            description={entry.content}
            badge={formatEntityType(entry.entityType)}
            expandable
          >
            <div className="flex flex-wrap items-center gap-2">
              {entry.confidence != null && (
                <Badge variant="outline">
                  {Math.round(entry.confidence * 100)}% confidence
                </Badge>
              )}
            </div>
          </InsightCard>
        </li>
      ))}
    </ul>
  );
}
