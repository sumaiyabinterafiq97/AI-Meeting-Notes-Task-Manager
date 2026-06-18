import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { getApiErrorMessage } from '@/lib/api-errors';
import { inviteMemberSchema, type InviteMemberFormData } from '../schemas/workspace.schemas';
import { useInviteMember } from '../hooks/useInviteMember';

interface InviteMemberFormProps {
  workspaceId: string;
}

export function InviteMemberForm({ workspaceId }: InviteMemberFormProps) {
  const inviteMutation = useInviteMember(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    await inviteMutation.mutateAsync(data);
    reset();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
        <CardDescription>Send an invitation link to join this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {inviteMutation.isError && (
            <ErrorAlert message={getApiErrorMessage(inviteMutation.error, 'Failed to send invite')} />
          )}
          {inviteMutation.isSuccess && (
            <p className="text-sm text-green-600" role="status">
              Invitation sent successfully.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <FormField id="invite-email" label="Email address" error={errors.email?.message} className="flex-1">
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                autoComplete="email"
                {...register('email')}
                {...getFieldAriaProps(errors.email?.message, 'invite-email')}
              />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" disabled={inviteMutation.isPending} className="min-h-10 w-full sm:w-auto">
                {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
