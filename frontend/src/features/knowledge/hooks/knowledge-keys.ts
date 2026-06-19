export const knowledgeKeys = {
  all: ['knowledge'] as const,
  list: (workspaceId: string, entityType?: string) =>
    [...knowledgeKeys.all, 'list', workspaceId, entityType ?? 'all'] as const,
  detail: (workspaceId: string, entryId: string) =>
    [...knowledgeKeys.all, 'detail', workspaceId, entryId] as const,
};
