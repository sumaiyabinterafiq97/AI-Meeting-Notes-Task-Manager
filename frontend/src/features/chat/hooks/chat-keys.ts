export const chatKeys = {
  all: ['chat'] as const,
  meetingMessages: (workspaceId: string, meetingId: string) =>
    [...chatKeys.all, 'meeting', workspaceId, meetingId] as const,
  sessions: (workspaceId: string) => [...chatKeys.all, 'sessions', workspaceId] as const,
  sessionMessages: (workspaceId: string, sessionId: string) =>
    [...chatKeys.all, 'session', workspaceId, sessionId] as const,
};
