import type { MeetingListFilters } from '../types/meeting.types';

export const meetingKeys = {
  all: ['meetings'] as const,
  lists: (workspaceId: string) => [...meetingKeys.all, 'list', workspaceId] as const,
  list: (workspaceId: string, filters: MeetingListFilters) =>
    [...meetingKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, meetingId: string) =>
    [...meetingKeys.all, 'detail', workspaceId, meetingId] as const,
};
