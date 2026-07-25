import { useRef, useState } from 'react';
import { FileAudio, FileVideo, Languages, Mic, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useStartTranscription, useUploadAudio } from '../hooks/useUploadAudio';
import { CaptureConsentNote } from '../capture/CaptureConsentNote';
import {
  ALLOWED_AUDIO_ACCEPT,
  MAX_AUDIO_BYTES,
  MAX_VIDEO_BYTES,
  type MeetingAudioMeta,
  type MeetingStatus,
} from '../types/meeting.types';

interface AudioUploadProps {
  workspaceId: string;
  meetingId: string;
  meetingStatus: MeetingStatus;
  hasTranscript: boolean;
  audio?: MeetingAudioMeta | null;
}

function isBusy(status: MeetingStatus): boolean {
  return status === 'TRANSCRIBING' || status === 'PROCESSING';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideoMeta(audio: MeetingAudioMeta): boolean {
  return audio.mimeType.startsWith('video/') || /\.(mp4|webm)$/i.test(audio.originalName);
}

export function AudioUpload({
  workspaceId,
  meetingId,
  meetingStatus,
  hasTranscript,
  audio,
}: AudioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAudio(workspaceId, meetingId);
  const startMutation = useStartTranscription(workspaceId, meetingId);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showReadyCallout, setShowReadyCallout] = useState(false);

  const busy = isBusy(meetingStatus);
  const disabled = busy || uploadMutation.isPending || startMutation.isPending;
  const hasPendingAudio =
    Boolean(audio) &&
    (audio!.status === 'PENDING' ||
      audio!.status === 'FAILED' ||
      (audio!.status === 'COMPLETED' && meetingStatus === 'READY'));

  const canStart =
    Boolean(audio) &&
    !busy &&
    (audio!.status === 'PENDING' ||
      audio!.status === 'FAILED' ||
      meetingStatus === 'READY' ||
      meetingStatus === 'FAILED' ||
      meetingStatus === 'DRAFT');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setShowReadyCallout(false);

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
      if (hasTranscript || audio) {
        const confirmed = window.confirm(
          hasTranscript
            ? 'This replaces the recording. Existing transcript/AI notes stay until you run Translate & Transcribe again. Continue?'
            : 'Replace the uploaded recording? Continue?',
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

  const handleStart = async () => {
    if (hasTranscript || meetingStatus === 'READY') {
      const confirmed = window.confirm(
        'This re-runs Translate & Transcribe and regenerates the English transcript and AI notes. Continue?',
      );
      if (!confirmed) return;
    }

    try {
      await startMutation.mutateAsync('translate_to_english');
      setShowReadyCallout(true);
    } catch {
      // Error via mutation state
    }
  };

  const startLabel =
    meetingStatus === 'READY' || hasTranscript
      ? 'Translate & Transcribe again'
      : meetingStatus === 'FAILED'
        ? 'Retry Translate & Transcribe'
        : 'Translate & Transcribe';

  return (
    <div className="space-y-4">
      {uploadMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(uploadMutation.error, 'Failed to upload recording')}
        />
      )}
      {startMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(
            startMutation.error,
            'Failed to start Translate & Transcribe',
          )}
        />
      )}
      {fileError && <ErrorAlert message={fileError} />}

      {meetingStatus === 'READY' && showReadyCallout && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
          role="status"
        >
          Translate & Transcribe complete. Insights are ready.
        </div>
      )}

      {!audio && meetingStatus === 'DRAFT' && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Mic className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Upload a recording</p>
              <p className="text-xs text-muted-foreground">
                Upload audio (.mp3, .m4a, .wav) or video (.mp4, .webm). Processing starts only when
                you click Translate & Transcribe.
              </p>
            </div>
          </div>
        </div>
      )}

      {audio && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            {isVideoMeta(audio) ? (
              <FileVideo className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <FileAudio className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium">{audio.originalName}</p>
              <p className="text-xs text-muted-foreground">
                {isVideoMeta(audio) ? 'Video' : 'Audio'} · {formatBytes(audio.fileSizeBytes)} ·{' '}
                {audio.mimeType}
              </p>
              {busy ? (
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200" role="status">
                  {meetingStatus === 'TRANSCRIBING'
                    ? 'Translating & transcribing…'
                    : 'Generating AI insights…'}
                </p>
              ) : audio.status === 'PENDING' || meetingStatus === 'DRAFT' ? (
                <p className="text-xs font-medium text-muted-foreground">
                  Uploaded — not processed yet
                </p>
              ) : audio.status === 'FAILED' || meetingStatus === 'FAILED' ? (
                <p className="text-xs font-medium text-destructive">
                  {audio.errorMessage ?? 'Processing failed'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Processed · {audio.status}</p>
              )}
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
          variant="outline"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {uploadMutation.isPending
            ? 'Uploading…'
            : audio
              ? 'Replace recording'
              : 'Upload recording'}
        </Button>

        {canStart && hasPendingAudio && (
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => void handleStart()}
            aria-busy={startMutation.isPending}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {startMutation.isPending || busy ? 'Translating & Transcribing…' : startLabel}
          </Button>
        )}

        <span className="text-xs text-muted-foreground">
          .mp3, .m4a, .wav · .mp4, .webm · audio 100MB / video 500MB
        </span>
      </div>

      {canStart && hasPendingAudio && !busy && (
        <p className="text-xs text-muted-foreground">
          Converts speech to English (Bengali → English; English kept). Then generates AI notes.
        </p>
      )}

      <CaptureConsentNote />
    </div>
  );
}
