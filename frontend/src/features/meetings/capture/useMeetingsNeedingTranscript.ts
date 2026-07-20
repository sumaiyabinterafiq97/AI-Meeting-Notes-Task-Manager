import { useQuery } from '@tanstack/react-query';
import { meetingApi } from '../services/meeting-api';
import { meetingKeys } from '../hooks/meeting-keys';

export function useMeetingsNeedingTranscript(workspaceId: string) {
  return useQuery({
    queryKey: [...meetingKeys.lists(workspaceId), 'needing-transcript'],
    queryFn: async () => {
      const { data } = await meetingApi.listNeedingTranscript(workspaceId);
      return data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
