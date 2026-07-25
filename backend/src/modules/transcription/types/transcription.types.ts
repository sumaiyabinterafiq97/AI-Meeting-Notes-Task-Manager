import type { TranscriptionJobStatus } from '@prisma/client';
import type { Request } from 'express';

export type UploadedAudioFile = NonNullable<Request['file']>;

export type TranscriptionProviderId = 'mock' | 'openai' | 'deepgram';

export interface TranscriptionInput {
  filePath: string;
  mimeType: string;
  originalName: string;
  /** Default: translate_to_english (Whisper translations → English). */
  mode?: TranscriptionMode;
}

export type TranscriptionMode = 'translate_to_english' | 'transcribe_original';

export interface TranscriptionResult {
  text: string;
  provider: TranscriptionProviderId;
  model?: string;
  mode?: TranscriptionMode;
}

export interface MeetingAudioDto {
  id: string;
  meetingId: string;
  workspaceId: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: TranscriptionJobStatus;
  errorMessage: string | null;
  transcribedAt: Date | null;
  createdAt: Date;
}

export interface UploadAudioResponseDto {
  meetingId: string;
  audioId: string;
  status: TranscriptionJobStatus;
  meetingStatus: string;
  /** Upload stores media only; pipeline starts via /transcription/start */
  processingStarted: boolean;
  audio?: MeetingAudioDto;
}

export interface StartTranscriptionDto {
  mode?: TranscriptionMode;
}

export interface TranscriptionStatusDto {
  meetingId: string;
  audio: MeetingAudioDto | null;
  meetingStatus: string;
  transcript: {
    charCount: number;
    sourceFormat: string;
    uploadedAt: Date;
  } | null;
}

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
] as const;

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav'] as const;

export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;

export const DEFAULT_AUDIO_MAX_BYTES = 100 * 1024 * 1024;
export const DEFAULT_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export function isVideoUpload(file: { mimetype: string; originalname: string }): boolean {
  const mime = file.mimetype.toLowerCase();
  const ext = file.originalname.toLowerCase();
  return (
    (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime) ||
    (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).some((e) => ext.endsWith(e))
  );
}

export function isAudioUpload(file: { mimetype: string; originalname: string }): boolean {
  const mime = file.mimetype.toLowerCase();
  const ext = file.originalname.toLowerCase();
  return (
    (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mime) ||
    (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).some((e) => ext.endsWith(e))
  );
}
