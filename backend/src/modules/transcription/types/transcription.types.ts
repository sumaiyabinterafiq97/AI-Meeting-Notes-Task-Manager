import type { TranscriptionJobStatus } from '@prisma/client';
import type { Request } from 'express';

export type UploadedAudioFile = NonNullable<Request['file']>;

export type TranscriptionProviderId = 'mock' | 'openai';

export interface TranscriptionInput {
  filePath: string;
  mimeType: string;
  originalName: string;
}

export interface TranscriptionResult {
  text: string;
  provider: TranscriptionProviderId;
  model?: string;
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

export const DEFAULT_AUDIO_MAX_BYTES = 100 * 1024 * 1024;
