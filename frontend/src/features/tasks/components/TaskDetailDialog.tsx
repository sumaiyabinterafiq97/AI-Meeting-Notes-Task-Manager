import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { toDateInputValue } from '@/lib/utils';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { useTask } from '../hooks/useTask';
import { useUpdateTask } from '../hooks/useUpdateTask';
import { useDeleteTask } from '../hooks/useDeleteTask';
import { updateTaskSchema, type UpdateTaskFormData } from '../schemas/task.schemas';
import { TaskStatusBadge } from './TaskStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TaskComments } from './TaskComments';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABELS } from '../types/task.types';

interface TaskDetailDialogProps {
  workspaceId: string;
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({
  workspaceId,
  taskId,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { data: task, isLoading, isError, error } = useTask(workspaceId, taskId ?? undefined);
  const { data: members = [] } = useWorkspaceMembers(workspaceId, open);
  const updateMutation = useUpdateTask(workspaceId, taskId ?? '');
  const deleteMutation = useDeleteTask(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateTaskFormData>({
    resolver: zodResolver(updateTaskSchema),
  });

  useEffect(() => {
    if (!task) return;

    reset({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      assigneeId: task.assigneeId ?? '',
      dueDate: toDateInputValue(task.dueDate),
      priority: task.priority,
    });
  }, [task, reset]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      updateMutation.reset();
      deleteMutation.reset();
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!taskId) return;
    await updateMutation.mutateAsync(data);
  });

  const handleDelete = () => {
    if (!taskId || !window.confirm('Delete this task? This action cannot be undone.')) {
      return;
    }

    deleteMutation.mutate(taskId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title={task?.title ?? 'Task details'}
      description={task ? 'View and update task details, status, and comments.' : undefined}
      className="max-w-2xl"
    >
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="Loading task" />
        </div>
      )}

      {isError && (
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load task')} />
      )}

      {task && !isLoading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.meeting && (
              <Link
                to={ROUTES.MEETING_DETAIL(workspaceId, task.meeting.id)}
                className="text-xs font-medium text-primary hover:underline"
              >
                From meeting: {task.meeting.title}
              </Link>
            )}
          </div>

          {(updateMutation.isError || deleteMutation.isError) && (
            <ErrorAlert
              message={getApiErrorMessage(
                updateMutation.error ?? deleteMutation.error,
                'Failed to update task',
              )}
            />
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField id="edit-task-title" label="Title" error={errors.title?.message}>
              <Input
                id="edit-task-title"
                {...register('title')}
                {...getFieldAriaProps(errors.title?.message, 'edit-task-title')}
              />
            </FormField>

            <FormField
              id="edit-task-description"
              label="Description"
              error={errors.description?.message}
            >
              <Textarea
                id="edit-task-description"
                rows={4}
                {...register('description')}
                {...getFieldAriaProps(errors.description?.message, 'edit-task-description')}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="edit-task-status" label="Status" error={errors.status?.message}>
                <select
                  id="edit-task-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('status')}
                  {...getFieldAriaProps(errors.status?.message, 'edit-task-status')}
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="edit-task-priority" label="Priority" error={errors.priority?.message}>
                <select
                  id="edit-task-priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('priority')}
                  {...getFieldAriaProps(errors.priority?.message, 'edit-task-priority')}
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="edit-task-assignee" label="Assignee" error={errors.assigneeId?.message}>
                <select
                  id="edit-task-assignee"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('assigneeId')}
                  {...getFieldAriaProps(errors.assigneeId?.message, 'edit-task-assignee')}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="edit-task-due-date" label="Due date" error={errors.dueDate?.message}>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  {...register('dueDate')}
                  {...getFieldAriaProps(errors.dueDate?.message, 'edit-task-due-date')}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-semibold">
              Comments {task.commentsCount > 0 && `(${task.commentsCount})`}
            </h3>
            <TaskComments workspaceId={workspaceId} taskId={task.id} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
