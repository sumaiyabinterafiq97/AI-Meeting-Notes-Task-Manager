import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MeetingStatus } from '../types/meeting.types';

const STATUS_CONFIG: Record<
  MeetingStatus,
  { label: string; variant: 'secondary' | 'outline'; className: string; spin?: boolean }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground',
  },
  PROCESSING: {
    label: 'Processing',
    variant: 'outline',
    className: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
    spin: true,
  },
  READY: {
    label: 'Ready',
    variant: 'outline',
    className: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200',
  },
  FAILED: {
    label: 'Failed',
    variant: 'outline',
    className: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  },
};

interface ProcessingStatusBadgeProps {
  status: MeetingStatus;
  className?: string;
}

export function ProcessingStatusBadge({ status, className }: ProcessingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn('gap-1.5', config.className, className)}>
      {config.spin && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
      <span>{config.label}</span>
    </Badge>
  );
}
