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
import { knowledgeExtractionService } from '../../src/modules/knowledge/knowledge.service';
import { api } from '../setup';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Knowledge & Reports API', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function seedMeeting(accessToken: string, workspaceId: string) {
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
        summary: 'Team discussed sprint planning and vendor follow-up.',
        decisions: [{ text: 'Ship Friday', context: 'Consensus' }],
        processingStatus: 'COMPLETED',
      },
    });

    await meetingEmbeddingService.embedMeeting(meetingId, workspaceId);
    return meetingId;
  }

  it('extracts knowledge entries after meeting processing hook', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();
    const user = await prisma.user.findFirst();
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: user!.id,
        title: 'Planning',
        meetingDate: new Date(),
        status: 'READY',
      },
    });

    await prisma.meetingTranscript.create({
      data: {
        meetingId: meeting.id,
        content: sampleTranscript,
        charCount: sampleTranscript.length,
      },
    });

    await prisma.meetingAiOutput.create({
      data: {
        meetingId: meeting.id,
        summary: 'Vendor API and Friday ship date discussed.',
        decisions: [{ text: 'Ship Friday', context: 'Team consensus' }],
        processingStatus: 'COMPLETED',
      },
    });

    const stored = await knowledgeExtractionService.extractFromMeeting(
      meeting.id,
      workspaceId,
    );

    expect(stored).toBeGreaterThan(0);

    const entries = await prisma.knowledgeEntry.findMany({ where: { workspaceId } });
    expect(entries.length).toBeGreaterThan(0);
  });

  it('generates weekly report via API', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await seedMeeting(accessToken, workspaceId);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/reports/generate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('COMPLETED');
    expect(response.body.contentMarkdown).toContain('Weekly Report');
    expect(response.body.contentJson.meetingCount).toBeGreaterThan(0);
  });

  it('lists knowledge entries and insights', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const meetingId = await seedMeeting(accessToken, workspaceId);
    await knowledgeExtractionService.extractFromMeeting(meetingId, workspaceId);

    const knowledge = await api
      .get(`/api/v1/workspaces/${workspaceId}/knowledge`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(knowledge.status).toBe(200);
    expect(knowledge.body.data.length).toBeGreaterThan(0);

    const entryId = knowledge.body.data[0].id as string;
    const detail = await api
      .get(`/api/v1/workspaces/${workspaceId}/knowledge/${entryId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(entryId);

    const insights = await api
      .get(`/api/v1/workspaces/${workspaceId}/insights`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(insights.status).toBe(200);
    expect(insights.body.insights.length).toBeGreaterThan(0);
  });
});
