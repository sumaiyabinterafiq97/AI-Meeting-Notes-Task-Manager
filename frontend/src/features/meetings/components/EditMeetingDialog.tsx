import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { toDatetimeLocalValue } from '@/lib/utils';
import { updateMeetingSchema, type UpdateMeetingFormData } from '../schemas/meeting.schemas';
import { useUpdateMeeting } from '../hooks/useUpdateMeeting';
import { MeetingFormFields } from './MeetingFormFields';
import type { MeetingDetail } from '../types/meeting.types';

interface EditMeetingDialogProps {
  workspaceId: string;
  meeting: MeetingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMeetingDialog({
  workspaceId,
  meeting,
  open,
  onOpenChange,
}: EditMeetingDialogProps) {
  const updateMutation = useUpdateMeeting(workspaceId, meeting.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateMeetingFormData>({
    resolver: zodResolver(updateMeetingSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        title: meeting.title,
        meetingDate: toDatetimeLocalValue(meeting.meetingDate),
        durationMinutes: meeting.durationMinutes ? String(meeting.durationMinutes) : '',
        attendeesInput: meeting.attendees.join(', '),
        tagsInput: meeting.tags.join(', '),
        agenda: meeting.agenda ?? '',
      });
    }
  }, [open, meeting, reset]);

  const onSubmit = handleSubmit(async (data) => {
    await updateMutation.mutateAsync(data);
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit meeting"
      description="Update meeting details."
      className="max-w-xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {updateMutation.isError && (
          <ErrorAlert message={getApiErrorMessage(updateMutation.error, 'Failed to update meeting')} />
        )}

        <MeetingFormFields register={register} errors={errors} idPrefix="edit-meeting" />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || meeting.status === 'PROCESSING'}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
