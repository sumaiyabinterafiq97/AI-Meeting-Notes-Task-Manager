import { Link } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { useKnowledgeEntry } from '../hooks/useKnowledgeEntry';
import { formatKnowledgeEntityType } from '../lib/knowledge-utils';
import { Badge } from '@/components/ui/badge';

interface KnowledgeDetailPanelProps {
  workspaceId: string;
  entryId: string | null;
}

export function KnowledgeDetailPanel({ workspaceId, entryId }: KnowledgeDetailPanelProps) {
  const { data: entry, isLoading, isError, error } = useKnowledgeEntry(
    workspaceId,
    entryId ?? undefined,
    Boolean(entryId),
  );

  if (!entryId) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Select a knowledge entry to view details and source links.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-lg border p-8">
        <LoadingSpinner label="Loading entry" />
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div className="rounded-lg border p-4">
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load knowledge entry')} />
      </div>
    );
  }

  return (
    <article className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{formatKnowledgeEntityType(entry.entityType)}</Badge>
          {entry.confidence != null && (
            <Badge variant="outline">{Math.round(entry.confidence * 100)}% confidence</Badge>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold">{entry.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {formatDateTime(entry.updatedAt)}
          </p>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.content}</p>

        {entry.sourceMeetingId && (
          <Link
            to={ROUTES.MEETING_DETAIL(workspaceId, entry.sourceMeetingId)}
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            View source meeting
          </Link>
        )}
      </div>
    </article>
  );
}
