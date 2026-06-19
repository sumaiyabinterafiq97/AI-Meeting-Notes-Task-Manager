import { apiClient } from '@/lib/api-client';
import { streamRequest } from '@/services/api';
import type { ChatStreamEvent } from '@/services/api';
import type {
  ChatMessage,
  ChatResponse,
  ChatSession,
  SendChatMessagePayload,
} from '../types/chat.types';

function meetingChatPath(workspaceId: string, meetingId: string): string {
  return `/workspaces/${workspaceId}/meetings/${meetingId}/chat`;
}

export const chatApi = {
  getMeetingMessages: (workspaceId: string, meetingId: string) =>
    apiClient.get<{ data: ChatMessage[] }>(meetingChatPath(workspaceId, meetingId)),

  sendMeetingMessage: (workspaceId: string, meetingId: string, payload: SendChatMessagePayload) =>
    apiClient.post<ChatResponse>(meetingChatPath(workspaceId, meetingId), payload, {
      params: { stream: 'false' },
    }),

  streamMeetingMessage: async (
    workspaceId: string,
    meetingId: string,
    payload: SendChatMessagePayload,
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    await streamRequest({
      url: meetingChatPath(workspaceId, meetingId),
      method: 'POST',
      body: payload,
      signal,
      onEvent,
    });
  },

  listWorkspaceSessions: (workspaceId: string) =>
    apiClient.get<{ data: ChatSession[] }>(`/workspaces/${workspaceId}/chat/sessions`),

  getSessionMessages: (workspaceId: string, sessionId: string) =>
    apiClient.get<{ data: ChatMessage[] }>(
      `/workspaces/${workspaceId}/chat/sessions/${sessionId}`,
    ),

  clearSession: (workspaceId: string, sessionId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/chat/sessions/${sessionId}`),

  streamWorkspaceMessage: async (
    workspaceId: string,
    payload: SendChatMessagePayload,
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    await streamRequest({
      url: `/workspaces/${workspaceId}/chat`,
      method: 'POST',
      body: payload,
      signal,
      onEvent,
    });
  },
};
