export type MeetingStatus = 'DRAFT' | 'TRANSCRIBING' | 'PROCESSING' | 'READY' | 'FAILED';

/** Formats for paste / text-file transcript upload (not audio). */
export type PasteTranscriptSourceFormat = 'text' | 'md' | 'vtt' | 'srt';

export type TranscriptSourceFormat = 'text' | 'md' | 'vtt' | 'srt' | 'audio' | 'video';

export type TranscriptionJobStatus = 'PENDING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';

export type AiProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Meeting {
  id: string;
  workspaceId: string;
  title: string;
  meetingDate: string;
  durationMinutes: number | null;
  attendees: string[];
  tags: string[];
  agenda: string | null;
  status: MeetingStatus;
  source?: string;
  meetUrl?: string | null;
  calendarHtmlLink?: string | null;
  externalCalendarEventId?: string | null;
  googleCalendarConnected?: boolean;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MeetingTranscriptMeta {
  id: string;
  content?: string;
  sourceFormat: TranscriptSourceFormat;
  charCount: number;
  uploadedAt: string;
}

export interface MeetingAiOutput {
  id: string;
  summary: string | null;
  topics: string[];
  decisions: unknown[];
  risks: unknown[];
  processingStatus: AiProcessingStatus;
  errorMessage?: string | null;
  processedAt: string | null;
  modelVersion: string | null;
}

export type ActionItemStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  suggestedAssigneeId: string | null;
  suggestedDueDate: string | null;
  status: ActionItemStatus;
  createdAt: string;
}

export interface LinkedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TaskFromActionItem extends LinkedTask {
  workspaceId: string;
  meetingId: string | null;
  actionItemId: string | null;
  description: string | null;
}

export interface MeetingDetail extends Meeting {
  transcript: MeetingTranscriptMeta | null;
  audio?: MeetingAudioMeta | null;
  aiOutput: MeetingAiOutput | null;
  actionItems: ActionItem[];
  linkedTasks: LinkedTask[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MeetingsListResponse {
  data: Meeting[];
  meta: PaginationMeta;
}

export interface MeetingListFilters {
  page?: number;
  limit?: number;
  status?: MeetingStatus;
  search?: string;
}

export interface UploadTranscriptResponse {
  meetingId: string;
  status: MeetingStatus;
  charCount: number;
}

export interface MeetingAudioMeta {
  id: string;
  meetingId: string;
  workspaceId: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: TranscriptionJobStatus;
  errorMessage: string | null;
  transcribedAt: string | null;
  createdAt: string;
}

export interface UploadAudioResponse {
  meetingId: string;
  audioId: string;
  status: TranscriptionJobStatus;
  meetingStatus: MeetingStatus;
  processingStarted?: boolean;
  audio?: MeetingAudioMeta;
}

export type TranscriptionStartMode = 'translate_to_english' | 'transcribe_original';

export interface TranscriptionStatusResponse {
  meetingId: string;
  meetingStatus: MeetingStatus;
  audio: MeetingAudioMeta | null;
  transcript: {
    charCount: number;
    sourceFormat: string;
    uploadedAt: string;
  } | null;
}

export const MIN_TRANSCRIPT_CHARS = 100;
export const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const ALLOWED_AUDIO_ACCEPT =
  'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,video/mp4,video/webm,.mp3,.m4a,.wav,.mp4,.webm';
