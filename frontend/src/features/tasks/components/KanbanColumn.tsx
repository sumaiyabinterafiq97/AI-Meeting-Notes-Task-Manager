import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../types/task.types';
import { TASK_STATUS_LABELS } from '../types/task.types';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  memberNames: Map<string, string>;
  onTaskOpen: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  updatingTaskId?: string | null;
  draggingTaskId?: string | null;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  onDropTask?: (taskId: string, status: TaskStatus) => void;
}

export function KanbanColumn({
  status,
  tasks,
  memberNames,
  onTaskOpen,
  onStatusChange,
  updatingTaskId,
  draggingTaskId,
  onDragStart,
  onDragEnd,
  onDropTask,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event: React.DragEvent) => {
    if (!draggingTaskId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const taskId = event.dataTransfer.getData('text/task-id');
    if (!taskId || !onDropTask) return;

    const droppedTask = tasks.find((task) => task.id === taskId);
    if (droppedTask?.status === status) return;

    onDropTask(taskId, status);
  };

  return (
    <section
      className={cn(
        'flex min-h-[20rem] flex-col rounded-xl border bg-muted/30 transition-colors',
        isDragOver && 'border-primary bg-primary/5',
      )}
      aria-label={`${TASK_STATUS_LABELS[status]} column`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isDragOver ? 'Drop here' : 'No tasks'}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeName={task.assigneeId ? memberNames.get(task.assigneeId) : undefined}
              onOpen={onTaskOpen}
              onStatusChange={onStatusChange}
              isUpdating={updatingTaskId === task.id}
              isDragging={draggingTaskId === task.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
