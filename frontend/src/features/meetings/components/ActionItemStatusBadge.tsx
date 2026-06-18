import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActionItemStatus } from '../types/meeting.types';

const STATUS_CONFIG: Record<
  ActionItemStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-muted bg-muted text-muted-foreground',
  },
};

interface ActionItemStatusBadgeProps {
  status: ActionItemStatus;
  className?: string;
}

export function ActionItemStatusBadge({ status, className }: ActionItemStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
