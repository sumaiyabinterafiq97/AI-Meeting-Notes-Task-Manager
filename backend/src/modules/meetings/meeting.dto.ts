import { MeetingStatus, WorkspaceRole, MeetingSource } from '@prisma/client';

export type TranscriptSourceFormat = 'text' | 'md' | 'vtt' | 'srt' | 'audio';

export interface CreateMeetingDto {
  title: string;
  meetingDate: string;
  durationMinutes?: number;
  attendees?: string[];
  tags?: string[];
  agenda?: string;
}

export interface UpdateMeetingDto {
  title?: string;
  meetingDate?: string;
  durationMinutes?: number | null;
  attendees?: string[];
  tags?: string[];
  agenda?: string | null;
}

export interface UploadTranscriptDto {
  content: string;
  sourceFormat: TranscriptSourceFormat;
}

export interface MeetingDto {
  id: string;
  workspaceId: string;
  title: string;
  meetingDate: Date;
  durationMinutes: number | null;
  attendees: string[];
  tags: string[];
  agenda: string | null;
  status: MeetingStatus;
  source?: MeetingSource;
  createdById: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MeetingListQuery {
  page?: string;
  limit?: string;
  status?: MeetingStatus;
  from?: string;
  to?: string;
  tag?: string;
  search?: string;
}

export interface TranscriptResponseDto {
  meetingId: string;
  status: MeetingStatus;
  charCount: number;
}

export interface ReprocessResponseDto {
  status: MeetingStatus;
}

export interface DeleteMeetingContext {
  userId: string;
  role: WorkspaceRole;
}

export const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;
export const MIN_TRANSCRIPT_CHARS = 100;
