import { Link } from 'react-router-dom';
import { CalendarClock, Mic } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { useMeetingsNeedingTranscript } from './useMeetingsNeedingTranscript';

interface MeetingsNeedingTranscriptProps {
  workspaceId: string;
}

export function MeetingsNeedingTranscript({ workspaceId }: MeetingsNeedingTranscriptProps) {
  const { data, isLoading, isError, error } = useMeetingsNeedingTranscript(workspaceId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner label="Loading meetings needing transcript" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorAlert
        message={getApiErrorMessage(error, 'Failed to load meetings needing a transcript')}
      />
    );
  }

  const meetings = data ?? [];
  if (meetings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 text-amber-800 dark:text-amber-200" aria-hidden />
        <div>
          <h3 className="text-sm font-medium">Meetings needing a transcript</h3>
          <p className="text-xs text-muted-foreground">
            Calendar meetings ended without a recording or transcript. Upload audio or import from
            Zoom / Meet / Teams.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {meetings.slice(0, 5).map((meeting) => (
          <li key={meeting.id}>
            <Link
              to={ROUTES.MEETING_DETAIL(workspaceId, meeting.id)}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-background/80"
            >
              <span className="font-medium">{meeting.title}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mic className="h-3 w-3" aria-hidden />
                {formatDateTime(meeting.meetingDate)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
