import { prisma } from '../../src/config/database';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import {
  setupWorkspaceWithAuth,
  createMeeting,
  sampleTranscript,
  meetingPayload,
} from '../helpers/meeting-helper';
import { meetingEmbeddingService } from '../../src/modules/embeddings/services/meeting-embedding.service';
import { api } from '../setup';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Reports API', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function seedEmbeddedMeeting(accessToken: string, workspaceId: string) {
    const created = await createMeeting(accessToken, workspaceId, {
      ...meetingPayload,
      meetingDate: new Date().toISOString(),
    });
    const meetingId = created.body.id as string;

    await api
      .put(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcript`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: sampleTranscript, sourceFormat: 'text' });

    await prisma.meetingAiOutput.update({
      where: { meetingId },
      data: {
        processingStatus: 'COMPLETED',
        summary: 'Discussed vendor contract and Q2 planning.',
      },
    });

    await meetingEmbeddingService.embedMeeting(meetingId, workspaceId);
    return meetingId;
  }

  it('generates a weekly report for a workspace with meetings', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await seedEmbeddedMeeting(accessToken, workspaceId);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/reports/generate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('COMPLETED');
    expect(response.body.contentMarkdown).toContain('#');
    expect(response.body.contentJson).toBeDefined();
    expect(response.body.contentJson.meetingCount).toBeGreaterThanOrEqual(1);
  });

  it('generates a low-activity report when no meetings exist in period', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/reports/generate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('COMPLETED');
    expect(response.body.contentJson.meetingCount).toBe(0);
    expect(response.body.contentMarkdown).toContain('Weekly');
  });

  it('lists and retrieves generated reports', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await seedEmbeddedMeeting(accessToken, workspaceId);

    const generated = await api
      .post(`/api/v1/workspaces/${workspaceId}/reports/generate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    const list = await api
      .get(`/api/v1/workspaces/${workspaceId}/reports`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);

    const reportId = generated.body.id as string;
    const detail = await api
      .get(`/api/v1/workspaces/${workspaceId}/reports/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(reportId);
  });
});
