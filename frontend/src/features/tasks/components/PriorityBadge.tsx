import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '../types/task.types';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  LOW: {
    label: 'Low',
    className: 'border-muted bg-muted text-muted-foreground',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  },
  HIGH: {
    label: 'High',
    className: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  },
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
