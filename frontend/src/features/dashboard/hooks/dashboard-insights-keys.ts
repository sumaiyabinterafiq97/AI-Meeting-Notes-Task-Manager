export const dashboardInsightsKeys = {
  all: ['dashboard-insights'] as const,
  detail: (workspaceId: string) => [...dashboardInsightsKeys.all, workspaceId] as const,
};
