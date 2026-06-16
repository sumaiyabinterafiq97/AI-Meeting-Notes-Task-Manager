import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import { setupWorkspaceWithAuth } from '../helpers/meeting-helper';
import { registerAndLogin, createWorkspace, seedInvitation } from '../helpers/workspace-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

const taskPayload = {
  title: 'Review API design doc',
  description: 'Check endpoints and error shapes',
  priority: 'HIGH',
};

async function createTask(
  accessToken: string,
  workspaceId: string,
  body: Record<string, unknown> = taskPayload,
) {
  return api
    .post(`/api/v1/workspaces/${workspaceId}/tasks`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
}

(dbAvailable ? describe : describe.skip)('Tasks Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('creates a task in a workspace', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await createTask(accessToken, workspaceId);

    expect(response.status).toBe(201);
    expect(response.body.title).toBe(taskPayload.title);
    expect(response.body.status).toBe('TODO');
    expect(response.body.workspaceId).toBe(workspaceId);
  });

  it('lists tasks with pagination', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await createTask(accessToken, workspaceId);

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/tasks?page=1&limit=10`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
  });

  it('returns kanban board grouped by status', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createTask(accessToken, workspaceId);
    const taskId = created.body.id as string;

    await api
      .patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'IN_PROGRESS' });

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/tasks/board`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.TODO).toEqual([]);
    expect(response.body.IN_PROGRESS).toHaveLength(1);
    expect(response.body.DONE).toEqual([]);
  });

  it('updates task and sets completedAt when marked DONE', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createTask(accessToken, workspaceId);
    const taskId = created.body.id as string;

    const response = await api
      .patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('DONE');
    expect(response.body.completedAt).toBeTruthy();
  });

  it('creates comment with mention notification', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      email: 'member@example.com',
      password: 'Password1',
      displayName: 'Member User',
    });

    const workspace = await createWorkspace(owner.accessToken, {
      name: 'Team Workspace',
      description: 'For mention tests',
    });
    const workspaceId = workspace.body.id as string;

    const token = await seedInvitation(owner.user.id, workspaceId, member.user.email);

    await api
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    const task = await createTask(owner.accessToken, workspaceId, {
      title: 'Mention test task',
    });

    const taskId = task.body.id as string;

    const commentResponse = await api
      .post(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ content: 'Hey @member please review this' });

    expect(commentResponse.status).toBe(201);

    const notifications = await api
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${member.accessToken}`);

    expect(notifications.status).toBe(200);
    expect(notifications.body.data.length).toBeGreaterThanOrEqual(1);
    const mention = notifications.body.data.find(
      (n: { type: string }) => n.type === 'TASK_MENTION',
    );
    expect(mention).toBeDefined();
  });

  it('soft deletes task as creator', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createTask(accessToken, workspaceId);
    const taskId = created.body.id as string;

    const response = await api
      .delete(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);

    const getResponse = await api
      .get(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getResponse.status).toBe(404);
  });
});
