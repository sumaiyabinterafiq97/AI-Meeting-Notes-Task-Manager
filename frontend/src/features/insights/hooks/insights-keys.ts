export const insightsKeys = {
  all: ['insights'] as const,
  knowledge: (workspaceId: string) => [...insightsKeys.all, 'knowledge', workspaceId] as const,
};
