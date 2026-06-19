import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InsightCard } from '@/components/ai/InsightCard';
import { formatDate } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import type { KnowledgeEntry } from '@/features/knowledge/types/knowledge.types';

interface WorkspaceDecisionsFeedProps {
  workspaceId: string;
  entries: KnowledgeEntry[];
}

export function WorkspaceDecisionsFeed({ workspaceId, entries }: WorkspaceDecisionsFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-sky-600" aria-hidden="true" />
          <CardTitle>Decision timeline</CardTitle>
        </div>
        <CardDescription>Decisions extracted from meetings and stored in workspace memory.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No decisions in the knowledge base yet. Process meeting transcripts to populate this feed.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.slice(0, 8).map((entry) => {
              const content = (
                <InsightCard
                  title={entry.title}
                  description={entry.content}
                  badge={formatDate(entry.createdAt)}
                  expandable
                />
              );

              if (!entry.sourceMeetingId) {
                return <li key={entry.id}>{content}</li>;
              }

              return (
                <li key={entry.id}>
                  <Link
                    to={ROUTES.MEETING_DETAIL(workspaceId, entry.sourceMeetingId)}
                    className="block rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
