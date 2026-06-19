import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface CitationData {
  index: number;
  chunkId?: string;
  meetingId?: string;
  meetingTitle?: string;
  excerpt: string;
}

interface CitationCardProps {
  citation: CitationData;
  workspaceId?: string;
  className?: string;
  compact?: boolean;
}

export function CitationCard({
  citation,
  workspaceId,
  className,
  compact = false,
}: CitationCardProps) {
  const meetingLink =
    workspaceId && citation.meetingId
      ? ROUTES.MEETING_DETAIL(workspaceId, citation.meetingId)
      : null;

  return (
    <Card className={cn('border-dashed', compact ? 'shadow-none' : '', className)}>
      <CardHeader className={cn(compact ? 'p-3 pb-1' : 'pb-2')}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn('text-sm font-medium', compact && 'text-xs')}>
            {citation.meetingTitle ?? 'Source'}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            [{citation.index}]
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(compact ? 'p-3 pt-0' : 'pt-0')}>
        <p className="line-clamp-3 text-xs text-muted-foreground">{citation.excerpt}</p>
        {meetingLink && (
          <Link
            to={meetingLink}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View meeting
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
