import { Calendar, Clock, Tag, Users, Video } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { MeetingDetail } from '../types/meeting.types';

interface MeetingMetadataProps {
  meeting: MeetingDetail;
}

function formatCountdown(meetingDate: string): string | null {
  const start = new Date(meetingDate).getTime();
  const diffMs = start - Date.now();
  if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) {
    return null;
  }
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) {
    return `Starts in ${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `Starts in ${hours}h ${rem}m`;
}

export function MeetingMetadata({ meeting }: MeetingMetadataProps) {
  const countdown = formatCountdown(meeting.meetingDate);

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Meeting date
        </dt>
        <dd className="mt-1 text-sm">
          {formatDateTime(meeting.meetingDate)}
          {countdown && <span className="ml-2 text-xs font-medium text-primary">{countdown}</span>}
        </dd>
      </div>

      {meeting.durationMinutes ? (
        <div>
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Duration
          </dt>
          <dd className="mt-1 text-sm">{meeting.durationMinutes} minutes</dd>
        </div>
      ) : null}

      {meeting.meetUrl ? (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Video className="h-4 w-4" aria-hidden="true" />
            Google Meet
          </dt>
          <dd className="mt-1 break-all text-sm">
            <a
              href={meeting.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {meeting.meetUrl}
            </a>
          </dd>
        </div>
      ) : null}

      {meeting.attendees.length > 0 ? (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            Attendees
          </dt>
          <dd className="mt-1 text-sm">{meeting.attendees.join(', ')}</dd>
        </div>
      ) : null}

      {meeting.tags.length > 0 ? (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Tag className="h-4 w-4" aria-hidden="true" />
            Tags
          </dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {meeting.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </dd>
        </div>
      ) : null}

      {meeting.agenda ? (
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-muted-foreground">Agenda</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">{meeting.agenda}</dd>
        </div>
      ) : null}
    </dl>
  );
}
