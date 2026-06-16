import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import {
  registerAndLogin,
  createWorkspace,
  seedInvitation,
  workspacePayload,
} from '../helpers/workspace-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Workspace Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('creates a workspace and assigns creator as OWNER', async () => {
    const { accessToken } = await registerAndLogin();

    const response = await createWorkspace(accessToken);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe(workspacePayload.name);
    expect(response.body.role).toBe('OWNER');
    expect(response.body.slug).toBe('engineering-team');
  });

  it('lists workspaces for authenticated user', async () => {
    const { accessToken } = await registerAndLogin();
    await createWorkspace(accessToken);

    const response = await api
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].memberCount).toBe(1);
  });

  it('returns workspace details for members', async () => {
    const { accessToken } = await registerAndLogin();
    const created = await createWorkspace(accessToken);
    const workspaceId = created.body.id as string;

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.memberCount).toBe(1);
  });

  it('forbids non-members from accessing workspace', async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin({
      email: 'outsider@example.com',
      password: 'Password1',
      displayName: 'Outsider',
    });

    const created = await createWorkspace(owner.accessToken);
    const workspaceId = created.body.id as string;

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('allows owner to update workspace settings', async () => {
    const { accessToken } = await registerAndLogin();
    const created = await createWorkspace(accessToken);
    const workspaceId = created.body.id as string;

    const response = await api
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Product Engineering' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Product Engineering');
    expect(response.body.slug).toBe('product-engineering');
  });

  it('forbids members from updating workspace settings', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      email: 'member@example.com',
      password: 'Password1',
      displayName: 'Member User',
    });

    const created = await createWorkspace(owner.accessToken);
    const workspaceId = created.body.id as string;

    const rawToken = await seedInvitation(owner.user.id, workspaceId, member.user.email);

    await api
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    const response = await api
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({ name: 'Hijacked Name' });

    expect(response.status).toBe(403);
  });

  it('accepts invitation for matching email', async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin({
      email: 'invitee@example.com',
      password: 'Password1',
      displayName: 'Invitee User',
    });

    const created = await createWorkspace(owner.accessToken);
    const workspaceId = created.body.id as string;
    const token = await seedInvitation(owner.user.id, workspaceId, invitee.user.email);

    const response = await api
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${invitee.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.workspace.id).toBe(workspaceId);
    expect(response.body.role).toBe('MEMBER');
  });

  it('rejects invitation when email does not match', async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin({
      email: 'invitee@example.com',
      password: 'Password1',
      displayName: 'Invitee User',
    });

    const created = await createWorkspace(owner.accessToken);
    const workspaceId = created.body.id as string;
    const token = await seedInvitation(owner.user.id, workspaceId, 'different@example.com');

    const response = await api
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${invitee.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('prevents removing the last owner', async () => {
    const { accessToken, user } = await registerAndLogin();
    const created = await createWorkspace(accessToken);
    const workspaceId = created.body.id as string;

    const response = await api
      .delete(`/api/v1/workspaces/${workspaceId}/members/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('last workspace owner');
  });

  it('requires authentication for workspace routes', async () => {
    const response = await api.get('/api/v1/workspaces');
    expect(response.status).toBe(401);
  });
});
