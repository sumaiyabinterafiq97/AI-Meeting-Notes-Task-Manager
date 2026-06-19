import { apiClient } from '@/lib/api-client';
import type { KnowledgeEntityType, KnowledgeEntry } from '../types/knowledge.types';

export const knowledgeApi = {
  list: (workspaceId: string, entityType?: KnowledgeEntityType) =>
    apiClient.get<{ data: KnowledgeEntry[] }>(`/workspaces/${workspaceId}/knowledge`, {
      params: entityType ? { entityType } : undefined,
    }),

  getById: (workspaceId: string, entryId: string) =>
    apiClient.get<KnowledgeEntry>(`/workspaces/${workspaceId}/knowledge/${entryId}`),
};
