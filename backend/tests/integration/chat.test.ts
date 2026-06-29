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
} from '../helpers/meeting-helper';
import { meetingEmbeddingService } from '../../src/modules/embeddings/services/meeting-embedding.service';
import { api } from '../setup';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Chat API', () => {
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
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await api
      .put(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcript`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: sampleTranscript, sourceFormat: 'text' });

    await prisma.meetingAiOutput.update({
      where: { meetingId },
      data: { processingStatus: 'COMPLETED' },
    });

    await meetingEmbeddingService.embedMeeting(meetingId, workspaceId);
    return meetingId;
  }

  it('returns non-streaming workspace chat reply', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await seedEmbeddedMeeting(accessToken, workspaceId);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/chat?stream=false`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'What did we discuss about the vendor?' });

    expect(response.status).toBe(200);
    expect(response.body.sessionId).toBeDefined();
    expect(response.body.messageId).toBeDefined();
    expect(response.body.reply).toContain('Mock response');
    expect(response.body.tokenUsage.completion).toBeGreaterThan(0);

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: response.body.sessionId },
    });
    expect(messages).toHaveLength(2);
  });

  it('streams meeting chat over SSE', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const meetingId = await seedEmbeddedMeeting(accessToken, workspaceId);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/chat`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'text/event-stream')
      .send({ message: 'Summarize vendor discussion' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: token');
    expect(response.text).toContain('event: done');
  });

  it('lists workspace chat sessions and messages', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await seedEmbeddedMeeting(accessToken, workspaceId);

    const chat = await api
      .post(`/api/v1/workspaces/${workspaceId}/chat?stream=false`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'Hello workspace chat' });

    const sessions = await api
      .get(`/api/v1/workspaces/${workspaceId}/chat/sessions`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(sessions.status).toBe(200);
    expect(sessions.body.data.length).toBeGreaterThan(0);

    const history = await api
      .get(`/api/v1/workspaces/${workspaceId}/chat/sessions/${chat.body.sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(history.status).toBe(200);
    expect(history.body.data.length).toBe(2);
  });

  it('returns meeting chat history', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const meetingId = await seedEmbeddedMeeting(accessToken, workspaceId);

    await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/chat?stream=false`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'What are the action items?' });

    const history = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/chat`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(history.status).toBe(200);
    expect(history.body.data.length).toBe(2);
  });

  it('returns grounded metadata on non-streaming reply', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    await seedEmbeddedMeeting(accessToken, workspaceId);

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/chat?stream=false`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'What did we discuss about the vendor?' });

    expect(response.status).toBe(200);
    expect(response.body.grounded).toBe(true);
    expect(response.body.refusalReason).toBeNull();
    expect(response.body.injectionDetected).toBe(false);
  });

  it('returns empty-context refusal when no embeddings exist', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/chat?stream=false`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'What decisions were made last week?' });

    expect(response.status).toBe(200);
    expect(response.body.grounded).toBe(false);
    expect(response.body.refusalReason).toBe('empty_context');
    expect(response.body.reply).toContain("couldn't find relevant information");
  });

  it('clears a workspace chat session', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();

    const chat = await api
      .post(`/api/v1/workspaces/${workspaceId}/chat?stream=false`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'Hello' });

    const cleared = await api
      .delete(`/api/v1/workspaces/${workspaceId}/chat/sessions/${chat.body.sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(cleared.status).toBe(204);

    const history = await api
      .get(`/api/v1/workspaces/${workspaceId}/chat/sessions/${chat.body.sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(history.status).toBe(404);
  });
});
