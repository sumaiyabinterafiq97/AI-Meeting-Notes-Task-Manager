export type MeetingStatus = 'DRAFT' | 'PROCESSING' | 'READY' | 'FAILED';

export type TranscriptSourceFormat = 'text' | 'md' | 'vtt' | 'srt';

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
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MeetingTranscriptMeta {
  id: string;
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

export const MIN_TRANSCRIPT_CHARS = 100;
export const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;
