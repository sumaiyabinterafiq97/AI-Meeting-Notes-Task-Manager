import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { toDatetimeLocalValue } from '@/lib/utils';
import { createMeetingSchema, type CreateMeetingFormData } from '../schemas/meeting.schemas';
import { useCreateMeeting } from '../hooks/useCreateMeeting';
import { MeetingFormFields } from './MeetingFormFields';

interface CreateMeetingDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMeetingDialog({
  workspaceId,
  open,
  onOpenChange,
}: CreateMeetingDialogProps) {
  const navigate = useNavigate();
  const createMutation = useCreateMeeting(workspaceId);
  const [formKey, setFormKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMeetingFormData>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      title: '',
      meetingDate: toDatetimeLocalValue(new Date()),
      durationMinutes: undefined,
      agenda: '',
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
    navigate(ROUTES.MEETING_DETAIL(workspaceId, response.data.id));
  });

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="New meeting"
      description="Create a meeting record to attach a transcript and generate AI notes."
      className="max-w-xl"
    >
      <form key={formKey} onSubmit={onSubmit} className="space-y-4" noValidate>
        {createMutation.isError && (
          <ErrorAlert message={getApiErrorMessage(createMutation.error, 'Failed to create meeting')} />
        )}

        <MeetingFormFields register={register} errors={errors} idPrefix="create-meeting" />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create meeting'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
