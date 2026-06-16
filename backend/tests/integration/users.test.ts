import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import { testUser } from '../helpers/auth-helper';
import { setupWorkspaceWithAuth } from '../helpers/meeting-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Users Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('updates user profile via PATCH /users/me', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const token = register.body.accessToken as string;

    const response = await api
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe('Updated Name');
    expect(response.body.email).toBe(testUser.email);
  });

  it('returns default notification preferences', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const token = register.body.accessToken as string;

    const response = await api
      .get('/api/v1/users/me/notification-preferences')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      emailTaskAssigned: true,
      emailDueSoon: true,
      inAppMentions: true,
    });
  });

  it('updates notification preferences', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const token = register.body.accessToken as string;

    const response = await api
      .patch('/api/v1/users/me/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ emailDueSoon: false });

    expect(response.status).toBe(200);
    expect(response.body.emailDueSoon).toBe(false);
    expect(response.body.emailTaskAssigned).toBe(true);
  });

  it('updates task position for kanban reorder', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const first = await api
      .post(`/api/v1/workspaces/${workspaceId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First task' });

    const second = await api
      .post(`/api/v1/workspaces/${workspaceId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Second task' });

    const taskId = second.body.id as string;

    const response = await api
      .patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ position: 0 });

    expect(response.status).toBe(200);
    expect(response.body.position).toBe(0);
    expect(first.body.id).toBeDefined();
  });
});
