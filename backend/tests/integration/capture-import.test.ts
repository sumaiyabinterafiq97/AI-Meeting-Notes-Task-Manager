import { api } from '../setup';
import { connectTestDatabase, disconnectTestDatabase, cleanDatabase } from '../helpers/db';
import { setupWorkspaceWithAuth } from '../helpers/meeting-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Capture import Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('imports via zoom mock path and reaches READY', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/imports/zoom`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Imported Zoom standup' });

    expect(response.status).toBe(202);
    expect(response.body.meetingId).toBeDefined();
    expect(response.body.meetingStatus).toBe('READY');
    expect(response.body.charCount).toBeGreaterThanOrEqual(100);
  });

  it('lists needing-transcript as empty when no calendar drafts', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/needing-transcript`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
