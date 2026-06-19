import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import type { KnowledgeEntry } from '../types/knowledge.types';

interface DecisionTimelineProps {
  workspaceId: string;
  entries: KnowledgeEntry[];
}

export function DecisionTimeline({ workspaceId, entries }: DecisionTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No decision entries yet. Decisions are extracted from processed meetings.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6" aria-label="Decision timeline">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>
              {formatDateTime(entry.createdAt)}
            </time>
            <h4 className="font-medium">{entry.title}</h4>
            <p className="text-sm text-muted-foreground">{entry.content}</p>
            {entry.sourceMeetingId && (
              <Link
                to={ROUTES.MEETING_DETAIL(workspaceId, entry.sourceMeetingId)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Source meeting
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
