import { prisma } from '../../src/config/database';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import { setupWorkspaceWithAuth } from '../helpers/meeting-helper';
import { meetingEmbeddingService } from '../../src/modules/embeddings/services/meeting-embedding.service';
import { ragService } from '../../src/modules/rag/services/rag.service';
import { ragCacheService } from '../../src/modules/rag/services/rag-cache.service';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('RAG pipeline', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    ragCacheService.clearMemory();
    await cleanDatabase();
  });

  it('retrieves embedded meeting context and prepares chat prompt', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: (await prisma.user.findFirst())!.id,
        title: 'Vendor Sync',
        meetingDate: new Date(),
        status: 'READY',
      },
    });

    await prisma.meetingTranscript.create({
      data: {
        meetingId: meeting.id,
        content: 'We must follow up with the vendor about API delivery dates.',
        charCount: 60,
      },
    });

    await prisma.meetingAiOutput.create({
      data: {
        meetingId: meeting.id,
        summary: 'Vendor API delivery is the main topic.',
        processingStatus: 'COMPLETED',
      },
    });

    await meetingEmbeddingService.embedMeeting(meeting.id, workspaceId);

    const search = await ragService.search({
      query: 'vendor API delivery',
      workspaceId,
      mode: 'hybrid',
      topK: 5,
    });

    expect(search.chunks.length).toBeGreaterThan(0);
    expect(search.cacheHit).toBe(false);

    const cachedSearch = await ragService.search({
      query: 'vendor API delivery',
      workspaceId,
      mode: 'hybrid',
      topK: 5,
    });
    expect(cachedSearch.cacheHit).toBe(true);

    const pipeline = await ragService.prepareChatPrompt(
      {
        query: 'What did we discuss about the vendor?',
        workspaceId,
        mode: 'hybrid',
        topK: 5,
      },
      [{ role: 'user', content: 'Hello' }],
    );

    expect(pipeline.context.blocks.length).toBeGreaterThan(0);
    expect(pipeline.prompt.messages.length).toBeGreaterThanOrEqual(3);
    expect(pipeline.prompt.messages[0].content).toContain('MeetingMind AI');
    expect(pipeline.prompt.messages.at(-1)?.content).toContain('vendor');
  });
});
