import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '../services/knowledge-api';
import { knowledgeKeys } from './knowledge-keys';

export function useKnowledgeEntry(
  workspaceId: string | undefined,
  entryId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: knowledgeKeys.detail(workspaceId ?? '', entryId ?? ''),
    queryFn: async () => {
      const { data } = await knowledgeApi.getById(workspaceId!, entryId!);
      return data;
    },
    enabled: Boolean(workspaceId && entryId && enabled),
  });
}
