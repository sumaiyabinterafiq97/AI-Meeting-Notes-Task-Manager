import { JobStatus } from '@prisma/client';
import { aiRepository } from '../../../src/modules/ai/ai.repository';
import { pipelineOrchestrator } from '../../../src/modules/agents/orchestrator/pipeline-orchestrator.service';
import { knowledgeExtractionService } from '../../../src/modules/knowledge/knowledge.service';
import * as queue from '../../../src/jobs/queue';
import { processMeetingJob } from '../../../src/jobs/process-meeting.job';

describe('processMeetingJob ordering', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs knowledge extraction before enqueueing meeting embed', async () => {
    const order: string[] = [];
    const jobId = '00000000-0000-0000-0000-0000000000a1';
    const meetingId = '00000000-0000-0000-0000-0000000000b1';
    const workspaceId = '00000000-0000-0000-0000-0000000000c1';

    const job = {
      id: jobId,
      status: JobStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      meetingId,
      workspaceId,
    };

    jest
      .spyOn(aiRepository, 'findJobById')
      .mockResolvedValueOnce(job as never)
      .mockResolvedValueOnce({ ...job, status: JobStatus.PROCESSING, attemptCount: 1 } as never);
    jest.spyOn(aiRepository, 'markJobProcessing').mockResolvedValue(undefined as never);
    jest.spyOn(aiRepository, 'getMeetingForProcessing').mockResolvedValue({
      id: meetingId,
      title: 'Test',
      meetingDate: new Date('2026-07-26'),
      durationMinutes: 30,
      tags: [],
      attendees: [],
      transcript: { content: 'Calisthenics roadmap discussion.' },
    } as never);
    jest.spyOn(aiRepository, 'getWorkspaceMembers').mockResolvedValue([] as never);
    jest.spyOn(pipelineOrchestrator, 'run').mockResolvedValue({
      result: {
        summary: 'Summary',
        topics: [],
        decisions: [],
        risks: [],
        actionItems: [],
      },
      modelVersion: 'mock',
      promptTokens: 1,
      completionTokens: 1,
      rawResponse: {},
    } as never);
    jest.spyOn(aiRepository, 'saveProcessingResult').mockResolvedValue(undefined as never);
    jest.spyOn(aiRepository, 'markJobCompleted').mockResolvedValue(undefined as never);

    jest.spyOn(knowledgeExtractionService, 'extractFromMeeting').mockImplementation(async () => {
      order.push('knowledge');
      return 0;
    });
    jest.spyOn(queue, 'enqueueEmbedMeeting').mockImplementation(async () => {
      order.push('embed');
      return undefined as never;
    });

    await processMeetingJob(jobId);

    expect(order).toEqual(['knowledge', 'embed']);
    expect(knowledgeExtractionService.extractFromMeeting).toHaveBeenCalledWith(
      meetingId,
      workspaceId,
      jobId,
    );
    expect(queue.enqueueEmbedMeeting).toHaveBeenCalledWith({ meetingId, workspaceId });
  });

  it('still enqueues embed when knowledge extraction fails', async () => {
    const jobId = '00000000-0000-0000-0000-0000000000a2';
    const meetingId = '00000000-0000-0000-0000-0000000000b2';
    const workspaceId = '00000000-0000-0000-0000-0000000000c2';

    const job = {
      id: jobId,
      status: JobStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      meetingId,
      workspaceId,
    };

    jest
      .spyOn(aiRepository, 'findJobById')
      .mockResolvedValueOnce(job as never)
      .mockResolvedValueOnce({ ...job, status: JobStatus.PROCESSING, attemptCount: 1 } as never);
    jest.spyOn(aiRepository, 'markJobProcessing').mockResolvedValue(undefined as never);
    jest.spyOn(aiRepository, 'getMeetingForProcessing').mockResolvedValue({
      id: meetingId,
      title: 'Test',
      meetingDate: new Date('2026-07-26'),
      durationMinutes: 30,
      tags: [],
      attendees: [],
      transcript: { content: 'Calisthenics roadmap discussion.' },
    } as never);
    jest.spyOn(aiRepository, 'getWorkspaceMembers').mockResolvedValue([] as never);
    jest.spyOn(pipelineOrchestrator, 'run').mockResolvedValue({
      result: {
        summary: 'Summary',
        topics: [],
        decisions: [],
        risks: [],
        actionItems: [],
      },
      modelVersion: 'mock',
      promptTokens: 1,
      completionTokens: 1,
      rawResponse: {},
    } as never);
    jest.spyOn(aiRepository, 'saveProcessingResult').mockResolvedValue(undefined as never);
    jest.spyOn(aiRepository, 'markJobCompleted').mockResolvedValue(undefined as never);
    jest
      .spyOn(knowledgeExtractionService, 'extractFromMeeting')
      .mockRejectedValue(new Error('knowledge down'));
    jest.spyOn(queue, 'enqueueEmbedMeeting').mockResolvedValue(undefined as never);

    await processMeetingJob(jobId);

    expect(queue.enqueueEmbedMeeting).toHaveBeenCalledWith({ meetingId, workspaceId });
  });
});
