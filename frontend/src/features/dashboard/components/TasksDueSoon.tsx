import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { DashboardTaskDueSoon } from '../types/dashboard.types';

interface TasksDueSoonProps {
  workspaceId: string;
  tasks: DashboardTaskDueSoon[];
}

export function TasksDueSoon({ workspaceId, tasks }: TasksDueSoonProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Tasks Due Soon</CardTitle>
          </div>
          <CardDescription>Open tasks due within the next 7 days.</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.TASKS(workspaceId)}>View board</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming due dates in the next week.</p>
        ) : (
          <ul className="space-y-3" aria-label="Tasks due soon">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <Link
                    to={ROUTES.TASKS(workspaceId, task.id)}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={task.dueDate}>Due {formatDate(task.dueDate)}</time>
                    {task.assigneeName && <span>· {task.assigneeName}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {task.isOverdue ? (
                    <Badge variant="outline" className="border-red-300 text-red-700">
                      Overdue
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {task.priority.toLowerCase()}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
