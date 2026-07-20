import type { MeetingImportProvider, MeetingSource } from '@prisma/client';

export type CaptureProviderId = 'zoom' | 'google-meet' | 'teams';

export interface NormalizedCapturePayload {
  title: string;
  meetingDate: Date;
  durationMinutes?: number;
  attendees?: string[];
  agenda?: string | null;
  transcriptText: string;
  sourceFormat: 'text' | 'vtt' | 'srt' | 'audio';
  meetingSource: MeetingSource;
  importProvider: MeetingImportProvider;
  externalMeetingId?: string;
  externalRecordingId?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportMeetingRequest {
  title?: string;
  meetingDate?: string;
  durationMinutes?: number;
  attendees?: string[];
  agenda?: string;
  /** Plain transcript or VTT/SRT content */
  transcriptText?: string;
  vttContent?: string;
  externalMeetingId?: string;
  externalRecordingId?: string;
  /** When true (or AI_USE_MOCK), use mock provider payload */
  useMock?: boolean;
}

export interface ImportMeetingResponse {
  meetingId: string;
  importId: string;
  provider: MeetingImportProvider;
  status: string;
  meetingStatus: string;
  charCount: number;
}

export interface MeetingNeedingTranscriptDto {
  id: string;
  title: string;
  meetingDate: Date;
  status: string;
  source: MeetingSource;
  externalCalendarEventId: string | null;
}
