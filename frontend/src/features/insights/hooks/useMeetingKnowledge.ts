import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '../services/knowledge-api';
import { insightsKeys } from './insights-keys';

export function useMeetingKnowledge(workspaceId: string | undefined, meetingId: string | undefined) {
  return useQuery({
    queryKey: insightsKeys.knowledge(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await knowledgeApi.list(workspaceId!);
      return data.data.filter((entry) => entry.sourceMeetingId === meetingId);
    },
    enabled: Boolean(workspaceId && meetingId),
  });
}
