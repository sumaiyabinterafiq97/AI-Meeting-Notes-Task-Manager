import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { getApiErrorMessage } from '@/lib/api-errors';
import { createWorkspaceSchema, type CreateWorkspaceFormData } from '../schemas/workspace.schemas';
import { useCreateWorkspace } from '../hooks/useCreateWorkspace';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workspaceId: string) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreated }: CreateWorkspaceDialogProps) {
  const createMutation = useCreateWorkspace();
  const [formKey, setFormKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', description: '' },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setFormKey((k) => k + 1);
      createMutation.reset();
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = handleSubmit(async (data) => {
    const response = await createMutation.mutateAsync(data);
    reset();
    createMutation.reset();
    onOpenChange(false);
    onCreated(response.data.id);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Create workspace"
      description="Set up a shared space for your team's meetings and tasks."
    >
      <form key={formKey} onSubmit={onSubmit} className="space-y-4" noValidate>
        {createMutation.isError && (
          <ErrorAlert
            message={getApiErrorMessage(createMutation.error, 'Failed to create workspace')}
          />
        )}

        <FormField id="workspace-name" label="Workspace name" error={errors.name?.message}>
          <Input
            id="workspace-name"
            placeholder="Product Team"
            {...register('name')}
            {...getFieldAriaProps(errors.name?.message, 'workspace-name')}
          />
        </FormField>

        <FormField
          id="workspace-description"
          label="Description (optional)"
          error={errors.description?.message}
        >
          <Textarea
            id="workspace-description"
            placeholder="What is this workspace for?"
            rows={3}
            {...register('description')}
            {...getFieldAriaProps(errors.description?.message, 'workspace-description')}
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create workspace'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
