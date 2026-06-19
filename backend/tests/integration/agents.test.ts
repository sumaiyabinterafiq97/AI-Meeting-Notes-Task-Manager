import { prisma } from '../../src/config/database';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import { setupWorkspaceWithAuth, sampleTranscript } from '../helpers/meeting-helper';
import { pipelineOrchestrator } from '../../src/modules/agents/orchestrator/pipeline-orchestrator.service';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Multi-agent pipeline', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('runs multi-agent extraction and logs agent executions', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();
    const user = await prisma.user.findFirst();
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: user!.id,
        title: 'Sprint Planning',
        meetingDate: new Date('2026-06-18'),
        status: 'PROCESSING',
      },
    });

    const job = await prisma.aiProcessingJob.create({
      data: {
        meetingId: meeting.id,
        workspaceId,
      },
    });

    const output = await pipelineOrchestrator.runMultiAgent({
      transcript: sampleTranscript,
      meetingTitle: meeting.title,
      meetingDate: '2026-06-18',
      attendees: ['Alex', 'Sam'],
      memberNames: ['Alex', 'Sam'],
      workspaceId,
      meetingId: meeting.id,
      jobId: job.id,
      correlationId: job.id,
    });

    expect(output.modelVersion).toBe('multi-agent');
    expect(output.result.summary).toBeTruthy();
    expect(output.result.topics.length).toBeGreaterThan(0);
    expect(output.result.actionItems.length).toBeGreaterThan(0);
    expect(output.result.decisions.length).toBeGreaterThan(0);
    expect(output.result.risks.length).toBeGreaterThan(0);
    expect(output.partialFailure).toBe(false);

    const executions = await prisma.agentExecution.findMany({
      where: { meetingId: meeting.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(executions).toHaveLength(4);
    expect(executions.every((entry) => entry.status === 'COMPLETED')).toBe(true);
    expect(new Set(executions.map((entry) => entry.agentType))).toEqual(
      new Set(['summarizer', 'task-extractor', 'decision', 'risk-analyzer']),
    );
  });
});
