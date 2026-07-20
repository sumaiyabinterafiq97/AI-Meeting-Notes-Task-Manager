import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Square, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useUploadAudio } from '../hooks/useUploadAudio';
import { CaptureConsentNote } from '../capture/CaptureConsentNote';
import { MAX_VIDEO_BYTES, type MeetingStatus } from '../types/meeting.types';
import { meetingApi } from '../services/meeting-api';

interface ScreenRecorderProps {
  workspaceId: string;
  meetingId: string;
  meetingStatus: MeetingStatus;
  /** When true, uploading will replace the existing recording (backend replace-on-upload). */
  hasRecording?: boolean;
}

type RecorderPhase = 'idle' | 'recording' | 'review' | 'uploading';

function pickMimeType(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function ScreenRecorder({
  workspaceId,
  meetingId,
  meetingStatus,
  hasRecording = false,
}: ScreenRecorderProps) {
  const uploadMutation = useUploadAudio(workspaceId, meetingId);
  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const busy = meetingStatus === 'TRANSCRIBING' || meetingStatus === 'PROCESSING';

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [cleanupStream, previewUrl]);

  const reportEvent = useCallback(
    async (event: 'started' | 'stopped' | 'upload_success') => {
      try {
        await meetingApi.recorderEvent(workspaceId, meetingId, event);
      } catch {
        // Telemetry is best-effort
      }
    },
    [workspaceId, meetingId],
  );

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen recording is not supported in this browser.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as MediaTrackConstraints,
        audio: true,
      });

      streamRef.current = displayStream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(displayStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: mimeType });
        setBlob(recorded);
        const url = URL.createObjectURL(recorded);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPhase('review');
        cleanupStream();
        void reportEvent('stopped');
      };

      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      });

      recorder.start(1000);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      void reportEvent('started');

      const hasAudio = displayStream.getAudioTracks().length > 0;
      if (!hasAudio) {
        setError(
          'No tab audio captured. When sharing, select the Google Meet tab and enable “Share tab audio”.',
        );
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError') {
        setError('Screen share permission denied. Allow sharing to record.');
      } else {
        setError('Could not start screen recording.');
      }
      cleanupStream();
      setPhase('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const discard = () => {
    cleanupStream();
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setElapsed(0);
    setPhase('idle');
    setError(null);
  };

  const upload = async () => {
    if (!blob) return;
    if (blob.size > MAX_VIDEO_BYTES) {
      setError('Recording exceeds 500MB limit. Record a shorter segment.');
      return;
    }

    if (hasRecording) {
      const confirmed = window.confirm(
        'This replaces the existing recording and regenerates AI notes. Continue?',
      );
      if (!confirmed) return;
    }

    setPhase('uploading');
    setError(null);
    try {
      const file = new File([blob], `meeting-recording-${Date.now()}.webm`, {
        type: blob.type || 'video/webm',
      });
      await uploadMutation.mutateAsync(file);
      void reportEvent('upload_success');
      discard();
    } catch (err) {
      setPhase('review');
      setError(getApiErrorMessage(err, 'Failed to upload recording'));
    }
  };

  if (busy) {
    return (
      <p className="text-sm text-muted-foreground">
        Recording is disabled while transcription or AI processing is running.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <h4 className="text-sm font-medium">Record meeting screen/tab</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Select the Google Meet tab and enable sharing tab audio. Recording stays in your browser
          until you upload.
        </p>
      </div>

      <CaptureConsentNote />
      <p className="text-xs text-muted-foreground">
        Screen recordings may include sensitive on-screen content. Only record meetings you are
        authorized to capture.
      </p>

      {error && <ErrorAlert message={error} />}

      {phase === 'idle' && (
        <Button type="button" onClick={() => void startRecording()}>
          <Circle className="h-4 w-4 text-red-600" aria-hidden="true" />
          Start recording
        </Button>
      )}

      {phase === 'recording' && (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-2 text-sm font-medium text-red-600"
            aria-live="polite"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            Recording {formatDuration(elapsed)}
          </span>
          <Button type="button" variant="destructive" onClick={stopRecording}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </Button>
          <Button type="button" variant="outline" onClick={discard}>
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
        </div>
      )}

      {phase === 'review' && blob && (
        <div className="space-y-3">
          {previewUrl && (
            <video src={previewUrl} controls className="max-h-48 w-full rounded-md bg-black" />
          )}
          <p className="text-xs text-muted-foreground">
            Duration {formatDuration(elapsed)} · {(blob.size / (1024 * 1024)).toFixed(1)} MB
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void upload()} disabled={uploadMutation.isPending}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {hasRecording ? 'Replace recording' : 'Upload recording'}
            </Button>
            <Button type="button" variant="outline" onClick={discard}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {phase === 'uploading' && (
        <p className="text-sm text-muted-foreground">
          Uploading recording into the transcript pipeline…
        </p>
      )}
    </div>
  );
}
