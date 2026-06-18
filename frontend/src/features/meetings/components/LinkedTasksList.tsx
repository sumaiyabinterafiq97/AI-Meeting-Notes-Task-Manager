import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import type { LinkedTask } from '../types/meeting.types';

interface LinkedTasksListProps {
  workspaceId: string;
  tasks: LinkedTask[];
}

export function LinkedTasksList({ workspaceId, tasks }: LinkedTasksListProps) {
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const memberNames = new Map(members.map((member) => [member.userId, member.displayName]));

  if (tasks.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2" aria-label="Linked tasks">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              {task.status.replace('_', ' ')}
              {task.assigneeId && memberNames.get(task.assigneeId) && (
                <> · {memberNames.get(task.assigneeId)}</>
              )}
              {task.dueDate && <> · Due {formatDate(task.dueDate)}</>}
            </p>
          </div>
          <Link
            to={ROUTES.TASKS(workspaceId, task.id)}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Open task
          </Link>
        </li>
      ))}
    </ul>
  );
}
