import { api } from '../setup';
import { registerAndLogin, createWorkspace } from './workspace-helper';

export const meetingPayload = {
  title: 'Sprint Planning',
  meetingDate: '2026-06-15T10:00:00.000Z',
  durationMinutes: 60,
  attendees: ['Alex', 'Jordan'],
  tags: ['sprint', 'planning'],
};

export const sampleTranscript = 'A'.repeat(120);

export async function setupWorkspaceWithAuth() {
  const { accessToken } = await registerAndLogin();
  const workspace = await createWorkspace(accessToken);
  return {
    accessToken,
    workspaceId: workspace.body.id as string,
  };
}

export async function createMeeting(
  accessToken: string,
  workspaceId: string,
  payload = meetingPayload,
) {
  return api
    .post(`/api/v1/workspaces/${workspaceId}/meetings`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload);
}
