import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ProcessingStatusBadge } from './ProcessingStatusBadge';
import type { Meeting } from '../types/meeting.types';

interface MeetingCardProps {
  workspaceId: string;
  meeting: Meeting;
}

export function MeetingCard({ workspaceId, meeting }: MeetingCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{meeting.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {formatDateTime(meeting.meetingDate)}
            </CardDescription>
          </div>
          <ProcessingStatusBadge status={meeting.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {meeting.attendees.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
            </span>
          )}
          {meeting.durationMinutes && <span>{meeting.durationMinutes} min</span>}
          <span>Created {formatDate(meeting.createdAt)}</span>
        </div>

        {meeting.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meeting.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link
          to={ROUTES.MEETING_DETAIL(workspaceId, meeting.id)}
          className="flex w-full items-center justify-between rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View meeting
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
