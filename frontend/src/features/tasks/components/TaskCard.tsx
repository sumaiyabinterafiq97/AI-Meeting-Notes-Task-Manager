import { Calendar, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDate, isPastDate } from '@/lib/utils';
import { PriorityBadge } from './PriorityBadge';
import type { Task, TaskStatus } from '../types/task.types';
import { TASK_STATUSES } from '../types/task.types';

interface TaskCardProps {
  task: Task;
  assigneeName?: string;
  onOpen: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  isUpdating?: boolean;
  isDragging?: boolean;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
}

export function TaskCard({
  task,
  assigneeName,
  onOpen,
  onStatusChange,
  isUpdating = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const statusIndex = TASK_STATUSES.indexOf(task.status);
  const prevStatus = statusIndex > 0 ? TASK_STATUSES[statusIndex - 1] : null;
  const nextStatus = statusIndex < TASK_STATUSES.length - 1 ? TASK_STATUSES[statusIndex + 1] : null;
  const isOverdue = task.dueDate && task.status !== 'DONE' && isPastDate(task.dueDate);

  return (
    <article
      draggable={!isUpdating}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/task-id', task.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart?.(task.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
        !isUpdating && 'cursor-grab active:cursor-grabbing',
      )}
      aria-label={`Task: ${task.title}`}
    >
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</h4>
          <PriorityBadge priority={task.priority} />
        </div>

        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {assigneeName && (
            <p className="flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" aria-hidden="true" />
              {assigneeName}
            </p>
          )}
          {task.dueDate && (
            <p
              className={cn('flex items-center gap-1', isOverdue && 'font-medium text-destructive')}
            >
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              {isOverdue ? 'Overdue · ' : ''}
              {formatDate(task.dueDate)}
            </p>
          )}
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!prevStatus || isUpdating}
          onClick={() => prevStatus && onStatusChange(task.id, prevStatus)}
          aria-label={`Move ${task.title} to previous column`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onOpen(task.id)}
        >
          Details
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!nextStatus || isUpdating}
          onClick={() => nextStatus && onStatusChange(task.id, nextStatus)}
          aria-label={`Move ${task.title} to next column`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
