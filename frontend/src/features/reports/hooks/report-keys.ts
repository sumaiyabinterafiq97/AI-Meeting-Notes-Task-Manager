export const reportKeys = {
  all: ['reports'] as const,
  list: (workspaceId: string) => [...reportKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, reportId: string) =>
    [...reportKeys.all, 'detail', workspaceId, reportId] as const,
};
