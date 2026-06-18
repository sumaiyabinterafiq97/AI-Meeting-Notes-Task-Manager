import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { createTaskSchema, type CreateTaskFormData } from '../schemas/task.schemas';
import { useCreateTask } from '../hooks/useCreateTask';
import { TaskFormFields } from './TaskFormFields';

interface CreateTaskDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (taskId: string) => void;
}

export function CreateTaskDialog({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: CreateTaskDialogProps) {
  const createMutation = useCreateTask(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId, open);
  const [formKey, setFormKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      dueDate: '',
      priority: 'MEDIUM',
    },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setFormKey((key) => key + 1);
      createMutation.reset();
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = handleSubmit(async (data) => {
    const response = await createMutation.mutateAsync(data);
    reset();
    createMutation.reset();
    onOpenChange(false);
    onCreated?.(response.data.id);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="New task"
      description="Create a task to track work in your workspace."
      className="max-w-xl"
    >
      <form key={formKey} onSubmit={onSubmit} className="space-y-4" noValidate>
        {createMutation.isError && (
          <ErrorAlert message={getApiErrorMessage(createMutation.error, 'Failed to create task')} />
        )}

        <TaskFormFields
          register={register}
          errors={errors}
          members={members}
          idPrefix="create-task"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
