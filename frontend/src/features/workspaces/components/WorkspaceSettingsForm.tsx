import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { getApiErrorMessage } from '@/lib/api-errors';
import { updateWorkspaceSchema, type UpdateWorkspaceFormData } from '../schemas/workspace.schemas';
import { useUpdateWorkspace } from '../hooks/useUpdateWorkspace';
import type { WorkspaceDetail } from '../types/workspace.types';

interface WorkspaceSettingsFormProps {
  workspace: WorkspaceDetail;
  canEdit: boolean;
}

export function WorkspaceSettingsForm({ workspace, canEdit }: WorkspaceSettingsFormProps) {
  const updateMutation = useUpdateWorkspace(workspace.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateWorkspaceFormData>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: workspace.name,
      description: workspace.description ?? '',
    });
  }, [workspace, reset]);

  const onSubmit = handleSubmit(async (data) => {
    await updateMutation.mutateAsync(data);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Update your workspace name and description.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {updateMutation.isError && (
            <ErrorAlert
              message={getApiErrorMessage(updateMutation.error, 'Failed to update workspace')}
            />
          )}
          {updateMutation.isSuccess && (
            <p className="text-sm text-green-600" role="status">
              Workspace updated successfully.
            </p>
          )}

          <FormField id="settings-name" label="Workspace name" error={errors.name?.message}>
            <Input
              id="settings-name"
              disabled={!canEdit}
              {...register('name')}
              {...getFieldAriaProps(errors.name?.message, 'settings-name')}
            />
          </FormField>

          <FormField
            id="settings-description"
            label="Description"
            error={errors.description?.message}
          >
            <Textarea
              id="settings-description"
              rows={3}
              disabled={!canEdit}
              {...register('description')}
              {...getFieldAriaProps(errors.description?.message, 'settings-description')}
            />
          </FormField>

          {canEdit && (
            <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
