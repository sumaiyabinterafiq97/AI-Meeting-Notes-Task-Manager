import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { formatActivityMessage } from '../lib/activity';
import type { DashboardActivity } from '../types/dashboard.types';

interface ActivityFeedProps {
  workspaceId: string;
  activities: DashboardActivity[];
}

function getActivityLink(workspaceId: string, activity: DashboardActivity): string | null {
  if (activity.entityType === 'meeting') {
    return ROUTES.MEETING_DETAIL(workspaceId, activity.entityId);
  }
  if (activity.entityType === 'task') {
    return ROUTES.TASKS(workspaceId, activity.entityId);
  }
  return null;
}

export function ActivityFeed({ workspaceId, activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates across meetings and tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="space-y-3" aria-label="Recent activity">
            {activities.map((activity) => {
              const link = getActivityLink(workspaceId, activity);
              const message = formatActivityMessage(activity);

              return (
                <li key={activity.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    {link ? (
                      <Link to={link} className="font-medium hover:underline">
                        {message}
                      </Link>
                    ) : (
                      <p>{message}</p>
                    )}
                  </div>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={activity.createdAt}
                  >
                    {formatDateTime(activity.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
