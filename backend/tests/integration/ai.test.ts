import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import {
  setupWorkspaceWithAuth,
  createMeeting,
  sampleTranscript,
} from '../helpers/meeting-helper';
import { prisma } from '../../src/config/database';

const dbAvailable = process.env.DATABASE_URL !== undefined;

async function uploadTranscript(
  accessToken: string,
  workspaceId: string,
  meetingId: string,
  content = sampleTranscript,
) {
  return api
    .put(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcript`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ content, sourceFormat: 'text' });
}

(dbAvailable ? describe : describe.skip)('AI Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('processes transcript with mock AI and returns completed output', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const upload = await uploadTranscript(accessToken, workspaceId, meetingId);
    expect(upload.status).toBe(200);
    expect(upload.body.status).toBe('READY');

    const output = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/ai-output`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(output.status).toBe(200);
    expect(output.body.processingStatus).toBe('COMPLETED');
    expect(output.body.summary).toContain('Mock analysis');
    expect(output.body.modelVersion).toBe('mock');
  });

  it('lists action items after processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await uploadTranscript(accessToken, workspaceId, meetingId);

    const response = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/action-items`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.data[0].status).toBe('PENDING');
  });

  it('accepts action items and creates tasks', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await uploadTranscript(accessToken, workspaceId, meetingId);

    const items = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/action-items`)
      .set('Authorization', `Bearer ${accessToken}`);

    const actionItemId = items.body.data[0].id as string;

    const accept = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/action-items/accept`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ actionItemIds: [actionItemId] });

    expect(accept.status).toBe(201);
    expect(accept.body.tasks).toHaveLength(1);
    expect(accept.body.tasks[0].actionItemId).toBe(actionItemId);

    const meeting = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meeting.body.linkedTasks).toHaveLength(1);
  });

  it('rejects action items', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await uploadTranscript(accessToken, workspaceId, meetingId);

    const items = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/action-items`)
      .set('Authorization', `Bearer ${accessToken}`);

    const actionItemIds = items.body.data.map((item: { id: string }) => item.id);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/action-items/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ actionItemIds });

    expect(response.status).toBe(200);
    expect(response.body.rejected).toBe(actionItemIds.length);
  });

  it('updates AI output manually', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await uploadTranscript(accessToken, workspaceId, meetingId);

    const response = await api
      .patch(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/ai-output`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ summary: 'Edited summary from user' });

    expect(response.status).toBe(200);
    expect(response.body.summary).toBe('Edited summary from user');
  });

  it('reprocesses a completed meeting', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await uploadTranscript(accessToken, workspaceId, meetingId);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/reprocess`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('READY');
  });

  it('rejects reprocess while meeting is processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await uploadTranscript(accessToken, workspaceId, meetingId);

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'PROCESSING' },
    });

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/reprocess`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
  });
});
