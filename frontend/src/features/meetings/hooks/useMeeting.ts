import { useQuery } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from './meeting-keys';
import type { MeetingStatus } from '../types/meeting.types';

const POLLING_STATUSES: MeetingStatus[] = ['PROCESSING'];

export function useMeeting(
  workspaceId: string | undefined,
  meetingId: string | undefined,
  options?: { enablePolling?: boolean },
) {
  return useQuery({
    queryKey: meetingKeys.detail(workspaceId ?? '', meetingId ?? ''),
    queryFn: async () => {
      const { data } = await meetingApi.getById(workspaceId!, meetingId!);
      return data;
    },
    enabled: Boolean(workspaceId && meetingId),
    refetchInterval: (query) => {
      if (!options?.enablePolling) return false;
      const status = query.state.data?.status;
      return status && POLLING_STATUSES.includes(status) ? 3000 : false;
    },
  });
}
