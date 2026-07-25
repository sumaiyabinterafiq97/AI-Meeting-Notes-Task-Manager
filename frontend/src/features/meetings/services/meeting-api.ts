import { apiClient } from '@/lib/api-client';
import { fromDatetimeLocalValue } from '@/lib/utils';
import type {
  Meeting,
  MeetingDetail,
  MeetingListFilters,
  MeetingsListResponse,
  MeetingStatus,
  PasteTranscriptSourceFormat,
  TranscriptSourceFormat,
  TranscriptionStartMode,
  TranscriptionStatusResponse,
  UploadAudioResponse,
  UploadTranscriptResponse,
} from '../types/meeting.types';
import type { CreateMeetingFormData, UpdateMeetingFormData } from '../schemas/meeting.schemas';
import { toMeetingPayload } from '../schemas/meeting.schemas';

function toApiPayload(data: CreateMeetingFormData | UpdateMeetingFormData) {
  const payload = toMeetingPayload(data);
  return {
    ...payload,
    meetingDate: fromDatetimeLocalValue(payload.meetingDate),
  };
}

export const meetingApi = {
  list: (workspaceId: string, filters: MeetingListFilters = {}) =>
    apiClient.get<MeetingsListResponse>(`/workspaces/${workspaceId}/meetings`, {
      params: filters,
    }),

  getById: (workspaceId: string, meetingId: string) =>
    apiClient.get<MeetingDetail>(`/workspaces/${workspaceId}/meetings/${meetingId}`),

  create: (workspaceId: string, data: CreateMeetingFormData) =>
    apiClient.post<Meeting>(`/workspaces/${workspaceId}/meetings`, toApiPayload(data)),

  update: (workspaceId: string, meetingId: string, data: UpdateMeetingFormData) =>
    apiClient.patch<Meeting>(
      `/workspaces/${workspaceId}/meetings/${meetingId}`,
      toApiPayload(data),
    ),

  delete: (workspaceId: string, meetingId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/meetings/${meetingId}`),

  uploadTranscript: (
    workspaceId: string,
    meetingId: string,
    content: string,
    sourceFormat: TranscriptSourceFormat,
  ) =>
    apiClient.put<UploadTranscriptResponse>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcript`,
      { content, sourceFormat },
    ),

  uploadAudio: (workspaceId: string, meetingId: string, file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    return apiClient.post<UploadAudioResponse>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/audio`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );
  },

  getTranscriptionStatus: (workspaceId: string, meetingId: string) =>
    apiClient.get<TranscriptionStatusResponse>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription`,
    ),

  retryTranscription: (workspaceId: string, meetingId: string) =>
    apiClient.post<UploadAudioResponse>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription/retry`,
    ),

  startTranscription: (
    workspaceId: string,
    meetingId: string,
    mode: TranscriptionStartMode = 'translate_to_english',
  ) =>
    apiClient.post<UploadAudioResponse>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription/start`,
      { mode },
    ),

  listNeedingTranscript: (workspaceId: string) =>
    apiClient.get<{
      data: Array<{
        id: string;
        title: string;
        meetingDate: string;
        status: MeetingStatus;
        source: string;
        externalCalendarEventId: string | null;
      }>;
    }>(`/workspaces/${workspaceId}/meetings/needing-transcript`),

  importFromZoom: (workspaceId: string, body: Record<string, unknown>) =>
    apiClient.post(`/workspaces/${workspaceId}/meetings/imports/zoom`, body),

  importFromGoogleMeet: (workspaceId: string, body: Record<string, unknown>) =>
    apiClient.post(`/workspaces/${workspaceId}/meetings/imports/google-meet`, body),

  importFromTeams: (workspaceId: string, body: Record<string, unknown>) =>
    apiClient.post(`/workspaces/${workspaceId}/meetings/imports/teams`, body),

  reprocess: (workspaceId: string, meetingId: string) =>
    apiClient.post<{ status: string }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/reprocess`,
    ),

  recorderEvent: (
    workspaceId: string,
    meetingId: string,
    event: 'started' | 'stopped' | 'upload_success',
  ) =>
    apiClient.post(`/workspaces/${workspaceId}/meetings/${meetingId}/recorder-events`, {
      event,
    }),
};

export function detectSourceFormat(filename: string): PasteTranscriptSourceFormat {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'md') return 'md';
  if (extension === 'vtt') return 'vtt';
  if (extension === 'srt') return 'srt';
  return 'text';
}
