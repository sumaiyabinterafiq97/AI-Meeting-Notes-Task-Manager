import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  uploadTranscriptSchema,
  type UploadTranscriptFormData,
} from '../schemas/meeting.schemas';
import { detectSourceFormat } from '../services/meeting-api';
import { useUploadTranscript } from '../hooks/useUploadTranscript';
import { MIN_TRANSCRIPT_CHARS, MAX_TRANSCRIPT_BYTES } from '../types/meeting.types';
import type { MeetingStatus } from '../types/meeting.types';

interface TranscriptUploadProps {
  workspaceId: string;
  meetingId: string;
  meetingStatus: MeetingStatus;
  hasTranscript: boolean;
}

export function TranscriptUpload({
  workspaceId,
  meetingId,
  meetingStatus,
  hasTranscript,
}: TranscriptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadTranscript(workspaceId, meetingId);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<UploadTranscriptFormData>({
    resolver: zodResolver(uploadTranscriptSchema),
    defaultValues: { content: '', sourceFormat: 'text' },
  });

  const content = useWatch({ control, name: 'content', defaultValue: '' });
  const charCount = content.length;
  const isProcessing = meetingStatus === 'PROCESSING';
  const isDisabled = isProcessing || uploadMutation.isPending;

  const onSubmit = handleSubmit(async (data) => {
    await uploadMutation.mutateAsync(data);
    setValue('content', '');
    setFileError(null);
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);

    if (file.size > MAX_TRANSCRIPT_BYTES) {
      setFileError('File exceeds 5MB limit');
      return;
    }

    try {
      const text = await file.text();
      setValue('content', text, { shouldValidate: true });
      setValue('sourceFormat', detectSourceFormat(file.name), { shouldValidate: true });
    } catch {
      setFileError('Failed to read file');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {uploadMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(uploadMutation.error, 'Failed to upload transcript')}
        />
      )}
      {fileError && <ErrorAlert message={fileError} />}

      {isProcessing && (
        <p className="text-sm text-blue-700 dark:text-blue-300" role="status">
          AI is processing your transcript. Upload is disabled until processing completes.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.vtt,.srt,text/plain,text/markdown"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isDisabled}
          aria-label="Upload transcript file"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload file
        </Button>
        <span className="flex items-center text-xs text-muted-foreground">
          Supports .txt, .md, .vtt, .srt (max 5MB)
        </span>
      </div>

      <FormField
        id="transcript-content"
        label={hasTranscript ? 'Replace transcript' : 'Paste transcript'}
        error={errors.content?.message}
      >
        <Textarea
          id="transcript-content"
          rows={10}
          placeholder={`Paste your meeting transcript here (minimum ${MIN_TRANSCRIPT_CHARS} characters)…`}
          disabled={isDisabled}
          {...register('content')}
          {...getFieldAriaProps(errors.content?.message, 'transcript-content')}
        />
      </FormField>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          <FileText className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {charCount.toLocaleString()} characters
          {charCount > 0 && charCount < MIN_TRANSCRIPT_CHARS && (
            <span className="text-destructive">
              {' '}
              · {MIN_TRANSCRIPT_CHARS - charCount} more required
            </span>
          )}
        </p>
        <Button type="submit" disabled={isDisabled || charCount < MIN_TRANSCRIPT_CHARS}>
          {uploadMutation.isPending
            ? 'Uploading…'
            : hasTranscript
              ? 'Replace & process'
              : 'Upload & process'}
        </Button>
      </div>
    </form>
  );
}
