import { apiClient } from '@/lib/api-client';
import { fromDatetimeLocalValue } from '@/lib/utils';
import type {
  Meeting,
  MeetingDetail,
  MeetingListFilters,
  MeetingsListResponse,
  TranscriptSourceFormat,
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

  reprocess: (workspaceId: string, meetingId: string) =>
    apiClient.post<{ status: string }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/reprocess`,
    ),
};

export function detectSourceFormat(filename: string): TranscriptSourceFormat {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'md') return 'md';
  if (extension === 'vtt') return 'vtt';
  if (extension === 'srt') return 'srt';
  return 'text';
}
