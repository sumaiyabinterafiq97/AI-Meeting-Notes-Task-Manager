import { JobStatus, Prisma } from '@prisma/client';
import { aiRepository } from '../modules/ai/ai.repository';
import { pipelineOrchestrator } from '../modules/agents/orchestrator/pipeline-orchestrator.service';
import { fuzzyMatchAssignee } from '../lib/fuzzy-match';
import { enqueueEmbedMeeting } from './queue';
import { knowledgeExtractionService } from '../modules/knowledge/knowledge.service';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown processing error';
}

export async function processMeetingJob(jobId: string): Promise<void> {
  const job = await aiRepository.findJobById(jobId);
  if (!job) {
    return;
  }

  if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
    return;
  }

  if (job.status === JobStatus.PROCESSING && job.attemptCount >= job.maxAttempts) {
    return;
  }

  if (job.status === JobStatus.PENDING) {
    await aiRepository.markJobProcessing(jobId);
  }

  const currentJob = await aiRepository.findJobById(jobId);
  if (!currentJob) {
    return;
  }

  try {
    const meeting = await aiRepository.getMeetingForProcessing(currentJob.meetingId);
    if (!meeting?.transcript) {
      throw new Error('Meeting transcript not found');
    }

    const members = await aiRepository.getWorkspaceMembers(currentJob.workspaceId);
    const memberNames = members.map((member) => member.user.displayName);
    const attendees = Array.isArray(meeting.attendees)
      ? (meeting.attendees as string[])
      : [];

    const pipelineOutput = await pipelineOrchestrator.run({
      transcript: meeting.transcript.content,
      meetingTitle: meeting.title,
      meetingDate: meeting.meetingDate.toISOString().slice(0, 10),
      durationMinutes: meeting.durationMinutes,
      tags: meeting.tags,
      attendees,
      memberNames,
      workspaceId: currentJob.workspaceId,
      meetingId: currentJob.meetingId,
      jobId,
      correlationId: jobId,
    });

    const actionItems = pipelineOutput.result.actionItems.map((item) => ({
      title: item.title.slice(0, 300),
      description: item.description,
      suggestedAssigneeId: fuzzyMatchAssignee(
        item.suggestedAssignee,
        members.map((member) => ({
          id: member.user.id,
          displayName: member.user.displayName,
        })),
      ),
      suggestedDueDate: item.suggestedDueDate ? new Date(item.suggestedDueDate) : null,
    }));

    await aiRepository.saveProcessingResult({
      meetingId: currentJob.meetingId,
      summary: pipelineOutput.result.summary,
      topics: pipelineOutput.result.topics,
      decisions: pipelineOutput.result.decisions as unknown as Prisma.InputJsonValue,
      risks: pipelineOutput.result.risks as unknown as Prisma.InputJsonValue,
      actionItems,
      modelVersion: pipelineOutput.modelVersion,
      promptTokens: pipelineOutput.promptTokens,
      completionTokens: pipelineOutput.completionTokens,
      rawResponse: pipelineOutput.rawResponse as object,
    });

    await aiRepository.markJobCompleted(jobId);

    await enqueueEmbedMeeting({
      meetingId: currentJob.meetingId,
      workspaceId: currentJob.workspaceId,
    });

    try {
      await knowledgeExtractionService.extractFromMeeting(
        currentJob.meetingId,
        currentJob.workspaceId,
        jobId,
      );
    } catch (error) {
      console.warn(
        `[process-meeting] Knowledge extraction failed for ${currentJob.meetingId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  } catch (error) {
    const message = getErrorMessage(error);
    const refreshed = await aiRepository.findJobById(jobId);

    if (refreshed && refreshed.attemptCount < refreshed.maxAttempts) {
      await aiRepository.resetJobForRetry(jobId, message);
      throw error;
    }

    if (refreshed) {
      await aiRepository.markJobFailed(jobId, message);
      await aiRepository.markMeetingFailed(refreshed.meetingId, message);
    }
  }
}
