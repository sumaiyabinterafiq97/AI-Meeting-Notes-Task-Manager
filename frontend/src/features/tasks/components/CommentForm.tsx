import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/common/MentionTextarea';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { createCommentSchema, type CreateCommentFormData } from '../schemas/task.schemas';
import { useCreateComment } from '../hooks/useCreateComment';

interface CommentFormProps {
  workspaceId: string;
  taskId: string;
}

export function CommentForm({ workspaceId, taskId }: CommentFormProps) {
  const { user } = useAuth();
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const createMutation = useCreateComment(workspaceId, taskId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentFormData>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { content: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    await createMutation.mutateAsync(data.content);
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {createMutation.isError && (
        <ErrorAlert message={getApiErrorMessage(createMutation.error, 'Failed to post comment')} />
      )}

      <FormField id="comment-content" label="Add comment" error={errors.content?.message}>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <MentionTextarea
              id="comment-content"
              rows={3}
              placeholder="Write a comment… Type @ to mention someone."
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              members={members}
              excludeUserId={user?.id}
              {...getFieldAriaProps(errors.content?.message, 'comment-content')}
            />
          )}
        />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Posting…' : 'Post comment'}
        </Button>
      </div>
    </form>
  );
}
