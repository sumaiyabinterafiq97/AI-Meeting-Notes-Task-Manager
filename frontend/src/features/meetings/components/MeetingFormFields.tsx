import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import type { CreateMeetingFormData } from '../schemas/meeting.schemas';

interface MeetingFormFieldsProps {
  register: UseFormRegister<CreateMeetingFormData>;
  errors: FieldErrors<CreateMeetingFormData>;
  idPrefix?: string;
}

export function MeetingFormFields({ register, errors, idPrefix = 'meeting' }: MeetingFormFieldsProps) {
  return (
    <>
      <FormField id={`${idPrefix}-title`} label="Title" error={errors.title?.message}>
        <Input
          id={`${idPrefix}-title`}
          placeholder="Sprint planning"
          {...register('title')}
          {...getFieldAriaProps(errors.title?.message, `${idPrefix}-title`)}
        />
      </FormField>

      <FormField
        id={`${idPrefix}-date`}
        label="Meeting date & time"
        error={errors.meetingDate?.message}
      >
        <Input
          id={`${idPrefix}-date`}
          type="datetime-local"
          {...register('meetingDate')}
          {...getFieldAriaProps(errors.meetingDate?.message, `${idPrefix}-date`)}
        />
      </FormField>

      <FormField
        id={`${idPrefix}-duration`}
        label="Duration (minutes, optional)"
        error={errors.durationMinutes?.message}
      >
        <Input
          id={`${idPrefix}-duration`}
          type="number"
          min={1}
          placeholder="60"
          {...register('durationMinutes')}
          {...getFieldAriaProps(errors.durationMinutes?.message, `${idPrefix}-duration`)}
        />
      </FormField>

      <FormField
        id={`${idPrefix}-attendees`}
        label="Attendees (comma-separated, optional)"
        error={errors.attendeesInput?.message}
      >
        <Input
          id={`${idPrefix}-attendees`}
          placeholder="Alex, Jordan"
          {...register('attendeesInput')}
          {...getFieldAriaProps(errors.attendeesInput?.message, `${idPrefix}-attendees`)}
        />
      </FormField>

      <FormField
        id={`${idPrefix}-tags`}
        label="Tags (comma-separated, optional)"
        error={errors.tagsInput?.message}
      >
        <Input
          id={`${idPrefix}-tags`}
          placeholder="sprint, planning"
          {...register('tagsInput')}
          {...getFieldAriaProps(errors.tagsInput?.message, `${idPrefix}-tags`)}
        />
      </FormField>

      <FormField id={`${idPrefix}-agenda`} label="Agenda (optional)" error={errors.agenda?.message}>
        <Textarea
          id={`${idPrefix}-agenda`}
          rows={3}
          placeholder="Topics to cover in this meeting"
          {...register('agenda')}
          {...getFieldAriaProps(errors.agenda?.message, `${idPrefix}-agenda`)}
        />
      </FormField>
    </>
  );
}
