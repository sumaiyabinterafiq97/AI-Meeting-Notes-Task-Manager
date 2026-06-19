import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import {
  setupWorkspaceWithAuth,
  createMeeting,
  meetingPayload,
} from '../helpers/meeting-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

const taskPayload = {
  title: 'Update API documentation',
  description: 'Align docs with implemented endpoints',
};

(dbAvailable ? describe : describe.skip)('Dashboard & Search Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('returns dashboard stats and activity', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await createMeeting(accessToken, workspaceId);

    const task = await api
      .post(`/api/v1/workspaces/${workspaceId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(taskPayload);

    const taskId = task.body.id as string;

    await api
      .patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE' });

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/dashboard`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.totalMeetings).toBe(1);
    expect(response.body.stats.openTasks).toBe(0);
    expect(response.body.stats.completedThisWeek).toBe(1);
    expect(response.body.aiMetrics).toMatchObject({
      summariesGenerated: expect.any(Number),
      pendingActionItems: expect.any(Number),
      failedProcessing: expect.any(Number),
    });
    expect(Array.isArray(response.body.recommendations)).toBe(true);
    expect(Array.isArray(response.body.tasksDueSoon)).toBe(true);
    expect(Array.isArray(response.body.recentMeetings)).toBe(true);
    expect(response.body.recentMeetings.length).toBeGreaterThanOrEqual(1);
    expect(response.body.productivity.tasksCompletedPerWeek).toHaveLength(8);
    expect(response.body.recentActivity.length).toBeGreaterThan(0);
  });

  it('searches meetings and tasks by query', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await createMeeting(accessToken, workspaceId, {
      ...meetingPayload,
      title: 'Quarterly Planning Session',
    });

    await api
      .post(`/api/v1/workspaces/${workspaceId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(taskPayload);

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/search?q=planning&type=all`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meetings.length).toBeGreaterThanOrEqual(1);
    expect(response.body.meta.meetingsTotal).toBeGreaterThanOrEqual(1);
  });

  it('filters search results by type', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await createMeeting(accessToken, workspaceId);

    await api
      .post(`/api/v1/workspaces/${workspaceId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(taskPayload);

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/search?q=documentation&type=tasks`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meetings).toEqual([]);
    expect(response.body.tasks).toHaveLength(1);
    expect(response.body.tasks[0].title).toBe(taskPayload.title);
  });

  it('rejects search queries shorter than 2 characters', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/search?q=a`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });
});
