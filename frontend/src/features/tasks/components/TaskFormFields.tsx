import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import type { WorkspaceMember } from '@/features/workspaces/types/workspace.types';
import type { CreateTaskFormData } from '../schemas/task.schemas';
import { TASK_PRIORITIES } from '../types/task.types';

interface TaskFormFieldsProps {
  register: UseFormRegister<CreateTaskFormData>;
  errors: FieldErrors<CreateTaskFormData>;
  members: WorkspaceMember[];
  idPrefix?: string;
}

export function TaskFormFields({
  register,
  errors,
  members,
  idPrefix = 'task',
}: TaskFormFieldsProps) {
  return (
    <>
      <FormField id={`${idPrefix}-title`} label="Title" error={errors.title?.message}>
        <Input
          id={`${idPrefix}-title`}
          placeholder="Update API documentation"
          {...register('title')}
          {...getFieldAriaProps(errors.title?.message, `${idPrefix}-title`)}
        />
      </FormField>

      <FormField
        id={`${idPrefix}-description`}
        label="Description"
        error={errors.description?.message}
      >
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          placeholder="Optional details…"
          {...register('description')}
          {...getFieldAriaProps(errors.description?.message, `${idPrefix}-description`)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${idPrefix}-assignee`}
          label="Assignee"
          error={errors.assigneeId?.message}
        >
          <select
            id={`${idPrefix}-assignee`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register('assigneeId')}
            {...getFieldAriaProps(errors.assigneeId?.message, `${idPrefix}-assignee`)}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id={`${idPrefix}-due-date`} label="Due date" error={errors.dueDate?.message}>
          <Input
            id={`${idPrefix}-due-date`}
            type="date"
            {...register('dueDate')}
            {...getFieldAriaProps(errors.dueDate?.message, `${idPrefix}-due-date`)}
          />
        </FormField>
      </div>

      <FormField id={`${idPrefix}-priority`} label="Priority" error={errors.priority?.message}>
        <select
          id={`${idPrefix}-priority`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="MEDIUM"
          {...register('priority')}
          {...getFieldAriaProps(errors.priority?.message, `${idPrefix}-priority`)}
        >
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority.charAt(0) + priority.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </FormField>
    </>
  );
}
