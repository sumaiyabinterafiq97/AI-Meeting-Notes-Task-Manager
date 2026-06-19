import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '../services/knowledge-api';
import { knowledgeKeys } from './knowledge-keys';
import type { KnowledgeEntityType } from '../types/knowledge.types';

export function useKnowledgeEntries(
  workspaceId: string | undefined,
  entityType?: KnowledgeEntityType,
) {
  return useQuery({
    queryKey: knowledgeKeys.list(workspaceId ?? '', entityType),
    queryFn: async () => {
      const { data } = await knowledgeApi.list(workspaceId!, entityType);
      return data.data;
    },
    enabled: Boolean(workspaceId),
  });
}
