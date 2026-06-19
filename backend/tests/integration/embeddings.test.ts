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
import { vectorService } from '../../src/modules/vector/services/vector.service';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Embeddings & Vector Search', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('embeds meeting content into document_chunks after processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await prisma.meetingTranscript.create({
      data: {
        meetingId,
        content: sampleTranscript,
        charCount: sampleTranscript.length,
      },
    });

    const aiOutput = await prisma.meetingAiOutput.create({
      data: {
        meetingId,
        summary: 'Team discussed sprint planning and vendor follow-up.',
        topics: ['planning'],
        decisions: [{ text: 'Ship Friday', context: 'Consensus' }],
        risks: [{ text: 'Vendor delay', severity: 'medium', context: 'API' }],
        processingStatus: 'COMPLETED',
        processedAt: new Date(),
        modelVersion: 'mock',
      },
    });

    await prisma.actionItemSuggestion.create({
      data: {
        meetingId,
        title: 'Follow up with vendor',
        description: 'Confirm delivery date',
      },
    });

    const result = await meetingEmbeddingService.embedMeeting(meetingId, workspaceId);
    expect(result.chunksStored).toBeGreaterThan(0);

    const chunks = await prisma.documentChunk.findMany({
      where: { meetingId },
    });
    expect(chunks.length).toBe(result.chunksStored);
    expect(chunks.some((chunk) => chunk.sourceType === 'TRANSCRIPT')).toBe(true);
    expect(chunks.some((chunk) => chunk.sourceType === 'SUMMARY')).toBe(true);
    const embeddedCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM document_chunks
      WHERE meeting_id = ${meetingId}::uuid
        AND embedding IS NOT NULL
    `;
    expect(Number(embeddedCount[0]?.count ?? 0)).toBe(result.chunksStored);

    const embeddingJob = await prisma.embeddingJob.findUnique({
      where: { id: result.jobId },
    });
    expect(embeddingJob?.status).toBe('COMPLETED');
    expect(embeddingJob?.chunksProcessed).toBe(result.chunksStored);

    void aiOutput;
  });

  it('performs semantic vector search over embedded chunks', async () => {
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

    const results = await vectorService.semanticSearch({
      workspaceId,
      query: 'vendor API delivery',
      mode: 'semantic',
      topK: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.content.toLowerCase()).toMatch(/vendor|api|delivery/);
  });
});
