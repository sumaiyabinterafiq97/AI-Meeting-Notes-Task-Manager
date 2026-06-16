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
  sampleTranscript,
} from '../helpers/meeting-helper';
import { registerAndLogin, createWorkspace } from '../helpers/workspace-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Meetings Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('creates a meeting in a workspace', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await createMeeting(accessToken, workspaceId);

    expect(response.status).toBe(201);
    expect(response.body.title).toBe(meetingPayload.title);
    expect(response.body.status).toBe('DRAFT');
    expect(response.body.workspaceId).toBe(workspaceId);
  });

  it('lists meetings with pagination', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await createMeeting(accessToken, workspaceId);

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings?page=1&limit=10`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
  });

  it('returns meeting detail with related data', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.transcript).toBeNull();
    expect(response.body.actionItems).toEqual([]);
    expect(response.body.linkedTasks).toEqual([]);
  });

  it('updates meeting metadata', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const response = await api
      .patch(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Sprint Planning' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Sprint Planning');
  });

  it('uploads transcript and completes mock AI processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const response = await api
      .put(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcript`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: sampleTranscript, sourceFormat: 'text' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('READY');
    expect(response.body.charCount).toBe(120);
  });

  it('rejects transcript shorter than minimum length', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const response = await api
      .put(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcript`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'too short', sourceFormat: 'text' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects reprocess while meeting is already processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await api
      .put(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcript`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: sampleTranscript, sourceFormat: 'md' });

    const { prisma } = await import('../../src/config/database');
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'PROCESSING' },
    });

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/reprocess`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
  });

  it('reprocesses when transcript exists and meeting is not processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const { meetingRepository } = await import('../../src/modules/meetings/meeting.repository');
    const { prisma } = await import('../../src/config/database');

    await meetingRepository.upsertTranscriptAndStartProcessing(meetingId, {
      content: sampleTranscript,
      sourceFormat: 'text',
      charCount: sampleTranscript.length,
    });

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'READY' },
    });

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/reprocess`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('READY');
  });

  it('allows creator to delete their meeting', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const response = await api
      .delete(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
  });

  it('forbids non-creator member from deleting meeting', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      email: 'member@example.com',
      password: 'Password1',
      displayName: 'Member User',
    });

    const workspace = await createWorkspace(owner.accessToken);
    const workspaceId = workspace.body.id as string;

    const created = await createMeeting(owner.accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const { seedInvitation } = await import('../helpers/workspace-helper');
    const token = await seedInvitation(owner.user.id, workspaceId, member.user.email);
    await api
      .post(`/api/v1/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    const response = await api
      .delete(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('returns 404 for meetings outside workspace scope', async () => {
    const first = await registerAndLogin();
    const firstWorkspace = await createWorkspace(first.accessToken);
    const created = await createMeeting(first.accessToken, firstWorkspace.body.id);

    const second = await registerAndLogin({
      email: 'other@example.com',
      password: 'Password1',
      displayName: 'Other User',
    });
    const secondWorkspace = await createWorkspace(second.accessToken);

    const response = await api
      .get(`/api/v1/workspaces/${secondWorkspace.body.id}/meetings/${created.body.id}`)
      .set('Authorization', `Bearer ${second.accessToken}`);

    expect(response.status).toBe(404);
  });
});
