import { Calendar, Clock, Tag, Users } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { MeetingDetail } from '../types/meeting.types';

interface MeetingMetadataProps {
  meeting: MeetingDetail;
}

export function MeetingMetadata({ meeting }: MeetingMetadataProps) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Meeting date
        </dt>
        <dd className="mt-1 text-sm">{formatDateTime(meeting.meetingDate)}</dd>
      </div>

      {meeting.durationMinutes && (
        <div>
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Duration
          </dt>
          <dd className="mt-1 text-sm">{meeting.durationMinutes} minutes</dd>
        </div>
      )}

      {meeting.attendees.length > 0 && (
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            Attendees
          </dt>
          <dd className="mt-1 text-sm">{meeting.attendees.join(', ')}</dd>
        </div>
      )}

      {meeting.tags.length > 0 && (
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
      )}

      {meeting.agenda && (
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-muted-foreground">Agenda</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">{meeting.agenda}</dd>
        </div>
      )}
    </dl>
  );
}
