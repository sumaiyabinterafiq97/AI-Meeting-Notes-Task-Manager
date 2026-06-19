import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import { registerAndLogin, createWorkspace } from '../helpers/workspace-helper';
import { prisma } from '../../src/config/database';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Calendar Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('connects mock Google calendar and syncs meeting stubs', async () => {
    const { accessToken } = await registerAndLogin();
    const workspace = await createWorkspace(accessToken);
    const workspaceId = workspace.body.id as string;

    const connect = await api
      .post(`/api/v1/workspaces/${workspaceId}/calendar/connect/google`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(connect.status).toBe(201);
    expect(connect.body.connected).toBe(true);
    expect(connect.body.mock).toBe(true);

    const meetings = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meetings.status).toBe(200);
    expect(meetings.body.data.length).toBeGreaterThanOrEqual(2);
    expect(meetings.body.data.some((m: { source: string }) => m.source === 'GOOGLE_CALENDAR')).toBe(
      true,
    );

    const sync = await api
      .post(`/api/v1/workspaces/${workspaceId}/calendar/sync`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(sync.status).toBe(200);
    expect(sync.body.results[0].eventsFetched).toBeGreaterThanOrEqual(2);

    const status = await api
      .get(`/api/v1/workspaces/${workspaceId}/calendar/sync-status`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status.status).toBe(200);
    expect(status.body.connections).toHaveLength(1);
    expect(status.body.lastSyncAt).toBeTruthy();
  });

  it('sends transcript reminder for past calendar meetings without transcript', async () => {
    const { accessToken, user } = await registerAndLogin();
    const workspace = await createWorkspace(accessToken);
    const workspaceId = workspace.body.id as string;

    await api
      .post(`/api/v1/workspaces/${workspaceId}/calendar/connect/google`)
      .set('Authorization', `Bearer ${accessToken}`);

    await api
      .post(`/api/v1/workspaces/${workspaceId}/calendar/sync`)
      .set('Authorization', `Bearer ${accessToken}`);

    const reminders = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: 'MEETING_TRANSCRIPT_REMINDER',
      },
    });

    expect(reminders.length).toBeGreaterThanOrEqual(1);
    expect(reminders[0].payload).toMatchObject({
      meetingTitle: expect.any(String),
    });
  });

  it('lists calendar connections', async () => {
    const { accessToken } = await registerAndLogin();
    const workspace = await createWorkspace(accessToken);
    const workspaceId = workspace.body.id as string;

    await api
      .post(`/api/v1/workspaces/${workspaceId}/calendar/connect/microsoft`)
      .set('Authorization', `Bearer ${accessToken}`);

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/calendar/connections`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].provider).toBe('MICROSOFT');
  });
});
