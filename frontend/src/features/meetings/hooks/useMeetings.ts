import { useQuery } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';
import type { MeetingListFilters } from '../types/meeting.types';

export function useMeetings(workspaceId: string | undefined, filters: MeetingListFilters = {}) {
  return useQuery({
    queryKey: meetingKeys.list(workspaceId ?? '', filters),
    queryFn: async () => {
      const { data } = await meetingApi.list(workspaceId!, filters);
      return data;
    },
    enabled: Boolean(workspaceId),
  });
}
