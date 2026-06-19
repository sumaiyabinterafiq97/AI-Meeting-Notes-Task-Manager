import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { DashboardRecentMeeting } from '../types/dashboard.types';

interface RecentMeetingsStripProps {
  workspaceId: string;
  meetings: DashboardRecentMeeting[];
}

export function RecentMeetingsStrip({ workspaceId, meetings }: RecentMeetingsStripProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <CardTitle>Recent Meetings</CardTitle>
        </div>
        <CardDescription>Latest meetings in this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meetings yet.</p>
        ) : (
          <ul className="space-y-3" aria-label="Recent meetings">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <Link
                    to={ROUTES.MEETING_DETAIL(workspaceId, meeting.id)}
                    className="font-medium hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <time className="text-xs text-muted-foreground" dateTime={meeting.meetingDate}>
                      {formatDate(meeting.meetingDate)}
                    </time>
                    {meeting.hasAiSummary && (
                      <Badge variant="secondary" className="text-[10px]">
                        AI summary
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {meeting.status.toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
