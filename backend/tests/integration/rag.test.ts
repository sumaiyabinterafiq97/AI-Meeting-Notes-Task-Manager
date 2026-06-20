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

  it('filters retrieval by meeting date range', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();
    const userId = (await prisma.user.findFirst())!.id;

    const earlyMeeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: userId,
        title: 'June Planning',
        meetingDate: new Date('2026-06-10T14:00:00.000Z'),
        status: 'READY',
      },
    });

    const lateMeeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: userId,
        title: 'July Planning',
        meetingDate: new Date('2026-06-20T14:00:00.000Z'),
        status: 'READY',
      },
    });

    await prisma.meetingTranscript.createMany({
      data: [
        {
          meetingId: earlyMeeting.id,
          content: 'Alpha project kickoff and roadmap alignment for Q3.',
          charCount: 55,
        },
        {
          meetingId: lateMeeting.id,
          content: 'Beta project kickoff and hiring pipeline review.',
          charCount: 52,
        },
      ],
    });

    await Promise.all([
      meetingEmbeddingService.embedMeeting(earlyMeeting.id, workspaceId),
      meetingEmbeddingService.embedMeeting(lateMeeting.id, workspaceId),
    ]);

    const filtered = await ragService.search({
      query: 'project kickoff',
      workspaceId,
      mode: 'hybrid',
      topK: 10,
      dateFrom: '2026-06-09',
      dateTo: '2026-06-15T23:59:59.999Z',
    });

    expect(filtered.chunks.length).toBeGreaterThan(0);
    expect(filtered.chunks.every((chunk) => chunk.meetingId === earlyMeeting.id)).toBe(true);
    expect(filtered.chunks.some((chunk) => chunk.content.includes('Alpha project'))).toBe(true);

    const unfiltered = await ragService.search({
      query: 'project kickoff',
      workspaceId,
      mode: 'hybrid',
      topK: 10,
    });

    const meetingIds = new Set(unfiltered.chunks.map((chunk) => chunk.meetingId));
    expect(meetingIds.has(earlyMeeting.id)).toBe(true);
    expect(meetingIds.has(lateMeeting.id)).toBe(true);
  });

  it('builds weekly context with the weekly token budget use case', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: (await prisma.user.findFirst())!.id,
        title: 'Weekly Sync',
        meetingDate: new Date('2026-06-12T10:00:00.000Z'),
        status: 'READY',
      },
    });

    await prisma.meetingTranscript.create({
      data: {
        meetingId: meeting.id,
        content: 'Shipped dashboard filters and closed three support tickets.',
        charCount: 58,
      },
    });

    await meetingEmbeddingService.embedMeeting(meeting.id, workspaceId);

    const context = await ragService.buildContext(
      {
        query: 'dashboard filters support tickets',
        workspaceId,
        mode: 'hybrid',
        topK: 5,
        dateFrom: '2026-06-09',
        dateTo: '2026-06-15T23:59:59.999Z',
      },
      { useCase: 'weekly' },
    );

    expect(context.blocks.length).toBeGreaterThan(0);
    expect(context.totalTokens).toBeGreaterThan(0);
  });
});
