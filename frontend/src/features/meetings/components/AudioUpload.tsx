import { useRef, useState } from 'react';
import { Mic, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useRetryTranscription, useUploadAudio } from '../hooks/useUploadAudio';
import { CaptureConsentNote } from '../capture/CaptureConsentNote';
import {
  ALLOWED_AUDIO_ACCEPT,
  MAX_AUDIO_BYTES,
  MAX_VIDEO_BYTES,
  type MeetingStatus,
} from '../types/meeting.types';

interface AudioUploadProps {
  workspaceId: string;
  meetingId: string;
  meetingStatus: MeetingStatus;
  hasTranscript: boolean;
}

function isBusy(status: MeetingStatus): boolean {
  return status === 'TRANSCRIBING' || status === 'PROCESSING';
}

export function AudioUpload({
  workspaceId,
  meetingId,
  meetingStatus,
  hasTranscript,
}: AudioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAudio(workspaceId, meetingId);
  const retryMutation = useRetryTranscription(workspaceId, meetingId);
  const [fileError, setFileError] = useState<string | null>(null);

  const busy = isBusy(meetingStatus);
  const canRetry = meetingStatus === 'FAILED';
  const disabled = busy || uploadMutation.isPending || retryMutation.isPending;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);

    const name = file.name.toLowerCase();
    const isVideo = name.endsWith('.mp4') || name.endsWith('.webm');
    const isAudio = name.endsWith('.mp3') || name.endsWith('.m4a') || name.endsWith('.wav');
    if (!isVideo && !isAudio) {
      setFileError('Unsupported format. Use .mp3, .m4a, .wav, .mp4, or .webm');
      event.target.value = '';
      return;
    }

    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
    if (file.size > limit) {
      setFileError(isVideo ? 'Video file exceeds 500MB limit' : 'Audio file exceeds 100MB limit');
      event.target.value = '';
      return;
    }

    try {
      if (hasTranscript) {
        const confirmed = window.confirm(
          'This replaces the existing recording and regenerates AI notes. Continue?',
        );
        if (!confirmed) {
          event.target.value = '';
          return;
        }
      }
      await uploadMutation.mutateAsync(file);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {uploadMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(uploadMutation.error, 'Failed to upload recording')}
        />
      )}
      {retryMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(retryMutation.error, 'Failed to retry transcription')}
        />
      )}
      {fileError && <ErrorAlert message={fileError} />}

      {!hasTranscript && meetingStatus === 'DRAFT' && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Mic className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Upload a recording or import from Zoom / Meet</p>
              <p className="text-xs text-muted-foreground">
                Upload audio (.mp3, .m4a, .wav) or video (.mp4, .webm). We extract audio from video,
                transcribe it, then run the existing AI pipeline.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_AUDIO_ACCEPT}
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled}
          aria-label="Upload meeting recording"
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {uploadMutation.isPending
            ? 'Uploading…'
            : hasTranscript
              ? 'Replace with recording'
              : 'Upload recording'}
        </Button>

        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => retryMutation.mutate()}
          >
            <RefreshCw
              className={`h-4 w-4 ${retryMutation.isPending ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {retryMutation.isPending ? 'Retrying…' : 'Retry transcription'}
          </Button>
        )}

        <span className="text-xs text-muted-foreground">
          .mp3, .m4a, .wav · .mp4, .webm · audio 100MB / video 500MB
        </span>
      </div>

      <CaptureConsentNote />
    </div>
  );
}
