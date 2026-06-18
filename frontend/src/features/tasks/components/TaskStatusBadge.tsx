import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TASK_STATUS_LABELS, type TaskStatus } from '../types/task.types';

const STATUS_CONFIG: Record<TaskStatus, string> = {
  TODO: 'border-muted bg-muted text-muted-foreground',
  IN_PROGRESS: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  DONE: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200',
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_CONFIG[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
