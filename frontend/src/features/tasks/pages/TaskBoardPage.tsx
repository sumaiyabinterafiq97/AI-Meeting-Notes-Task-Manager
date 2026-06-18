import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { useTaskBoard } from '../hooks/useTaskBoard';
import { taskApi } from '../services/task-api';
import { taskKeys } from '../hooks/task-keys';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskBoardFilters } from '../components/TaskBoardFilters';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { TASK_STATUSES, type TaskStatus } from '../types/task.types';

export function TaskBoardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTaskId = searchParams.get('taskId');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const activeTaskId = queryTaskId ?? selectedTaskId;

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSearchParams({ taskId }, { replace: true });
  };

  const closeTaskDetail = () => {
    setSelectedTaskId(null);
    if (searchParams.has('taskId')) {
      setSearchParams({}, { replace: true });
    }
  };

  const boardFilters = assigneeId ? { assigneeId } : {};
  const { data: board, isLoading, isError, error } = useTaskBoard(workspaceId, boardFilters);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.userId, member.displayName])),
    [members],
  );

  const totalTasks = board
    ? board.TODO.length + board.IN_PROGRESS.length + board.DONE.length
    : 0;

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!workspaceId) return;

    setUpdatingTaskId(taskId);
    try {
      await taskApi.update(workspaceId, taskId, { status });
      await queryClient.invalidateQueries({
        queryKey: [...taskKeys.all, 'board', workspaceId],
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h2>
          <p className="text-muted-foreground">Track action items and team workflow.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="min-h-10 shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New task
        </Button>
      </div>

      <TaskBoardFilters
        assigneeId={assigneeId}
        members={members}
        onAssigneeChange={setAssigneeId}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading board" />
        </div>
      )}

      {isError && <ErrorAlert message={getApiErrorMessage(error, 'Failed to load tasks')} />}

      {!isLoading && !isError && totalTasks === 0 && (
        <EmptyState
          title="No tasks yet"
          description="Create a task manually or accept action items from a meeting."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New task
            </Button>
          }
        />
      )}

      {!isLoading && board && totalTasks > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={board[status]}
              memberNames={memberNames}
              onTaskOpen={openTaskDetail}
              onStatusChange={(taskId, nextStatus) => void handleStatusChange(taskId, nextStatus)}
              updatingTaskId={updatingTaskId}
              draggingTaskId={draggingTaskId}
              onDragStart={setDraggingTaskId}
              onDragEnd={() => setDraggingTaskId(null)}
              onDropTask={(taskId, status) => void handleStatusChange(taskId, status)}
            />
          ))}
        </div>
      )}

      <CreateTaskDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(taskId) => openTaskDetail(taskId)}
      />

      <TaskDetailDialog
        workspaceId={workspaceId}
        taskId={activeTaskId}
        open={Boolean(activeTaskId)}
        onOpenChange={(open) => {
          if (!open) closeTaskDetail();
        }}
      />
    </div>
  );
}
