import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Download, Square, Upload, X } from 'lucide-react';
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

/**
 * Mix tab/system audio with microphone into one MediaStreamTrack.
 * Meet tab audio usually excludes the local speaker; mic fills that gap.
 */
function mixAudioTracks(
  audioTracks: MediaStreamTrack[],
  audioContext: AudioContext,
): MediaStreamTrack | null {
  if (audioTracks.length === 0) return null;

  const destination = audioContext.createMediaStreamDestination();
  for (const track of audioTracks) {
    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
    source.connect(destination);
  }

  return destination.stream.getAudioTracks()[0] ?? null;
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
  /** Stream passed to MediaRecorder (video + mixed audio). */
  const recordStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const busy = meetingStatus === 'TRANSCRIBING' || meetingStatus === 'PROCESSING';

  const cleanupStream = useCallback(() => {
    mediaRecorderRef.current = null;
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
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
      displayStreamRef.current = displayStream;

      let micStream: MediaStream | null = null;
      let micDenied = false;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        micStreamRef.current = micStream;
      } catch {
        micDenied = true;
        micStream = null;
      }

      const tabAudioTracks = displayStream.getAudioTracks();
      const micAudioTracks = micStream?.getAudioTracks() ?? [];
      const audioSources = [...tabAudioTracks, ...micAudioTracks];

      let mixedAudioTrack: MediaStreamTrack | null = null;
      if (audioSources.length > 0) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioContext = new AudioCtx();
          audioContextRef.current = audioContext;
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          mixedAudioTrack = mixAudioTracks(audioSources, audioContext);
        }
      }

      const videoTracks = displayStream.getVideoTracks();
      const recordTracks: MediaStreamTrack[] = [...videoTracks];
      if (mixedAudioTrack) {
        recordTracks.push(mixedAudioTrack);
      } else if (tabAudioTracks[0]) {
        recordTracks.push(tabAudioTracks[0]);
      } else if (micAudioTracks[0]) {
        recordTracks.push(micAudioTracks[0]);
      }

      const recordStream = new MediaStream(recordTracks);
      recordStreamRef.current = recordStream;

      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(recordStream, { mimeType });
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

      videoTracks[0]?.addEventListener('ended', () => {
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

      const warnings: string[] = [];
      if (tabAudioTracks.length === 0) {
        warnings.push(
          'No tab audio captured. When sharing, select the Google Meet tab and enable “Share tab audio”.',
        );
      }
      if (micDenied) {
        warnings.push(
          'Microphone permission denied — your voice will not be included. Allow the mic and start again, or use headphones and retry.',
        );
      } else if (micAudioTracks.length === 0 && tabAudioTracks.length > 0) {
        warnings.push('Microphone was not added. Your voice may be missing from the recording.');
      }
      if (warnings.length > 0) {
        setError(warnings.join(' '));
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

  const downloadLocal = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `meeting-recording-${Date.now()}.webm`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const upload = async () => {
    if (!blob) return;
    if (blob.size > MAX_VIDEO_BYTES) {
      setError('Recording exceeds 500MB limit. Record a shorter segment.');
      return;
    }

    if (hasRecording) {
      const confirmed = window.confirm(
        'This replaces the uploaded recording. Run Translate & Transcribe again afterward to update the transcript. Continue?',
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
        Recording is disabled while Translate &amp; Transcribe or AI processing is running.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <h4 className="text-sm font-medium">Record meeting screen/tab</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Select the Google Meet tab and enable <strong>Share tab audio</strong> (other people).
          Allow the <strong>microphone</strong> when prompted (your voice). Prefer headphones to
          reduce echo. Upload stores the file only — use Translate &amp; Transcribe in Upload
          recording to process.
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
            <Button type="button" variant="outline" onClick={downloadLocal}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download recording
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
