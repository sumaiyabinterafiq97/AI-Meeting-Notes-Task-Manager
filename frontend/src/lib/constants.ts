export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const APP_NAME = 'AI Meeting Notes & Task Manager';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  WORKSPACES: '/workspaces',
  DASHBOARD: (workspaceId: string) => `/workspaces/${workspaceId}/dashboard`,
  MEETINGS: (workspaceId: string) => `/workspaces/${workspaceId}/meetings`,
  TASKS: (workspaceId: string) => `/workspaces/${workspaceId}/tasks`,
  SETTINGS: (workspaceId: string) => `/workspaces/${workspaceId}/settings`,
} as const;
