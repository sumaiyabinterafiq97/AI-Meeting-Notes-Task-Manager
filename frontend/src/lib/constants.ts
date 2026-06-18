export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const APP_NAME = 'AI Meeting Notes & Task Manager';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  WORKSPACES: '/workspaces',
  INVITATION_ACCEPT: (token: string) => `/invitations/${token}/accept`,
  DASHBOARD: (workspaceId: string) => `/workspaces/${workspaceId}/dashboard`,
  MEETINGS: (workspaceId: string) => `/workspaces/${workspaceId}/meetings`,
  MEETING_DETAIL: (workspaceId: string, meetingId: string) =>
    `/workspaces/${workspaceId}/meetings/${meetingId}`,
  TASKS: (workspaceId: string, taskId?: string) =>
    taskId
      ? `/workspaces/${workspaceId}/tasks?taskId=${taskId}`
      : `/workspaces/${workspaceId}/tasks`,
  SETTINGS: (workspaceId: string) => `/workspaces/${workspaceId}/settings`,
  ACCOUNT_NOTIFICATIONS: '/account/notifications',
} as const;
