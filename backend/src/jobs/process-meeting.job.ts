import { JobStatus, Prisma } from '@prisma/client';
import { aiRepository } from '../modules/ai/ai.repository';
import { analyzeTranscript } from '../lib/openai';
import { fuzzyMatchAssignee } from '../lib/fuzzy-match';

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

    const analysis = await analyzeTranscript({
      transcript: meeting.transcript.content,
      meetingTitle: meeting.title,
      attendees,
      memberNames,
    });

    const actionItems = analysis.result.actionItems.map((item) => ({
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
      summary: analysis.result.summary,
      topics: analysis.result.topics,
      decisions: analysis.result.decisions as unknown as Prisma.InputJsonValue,
      risks: analysis.result.risks as unknown as Prisma.InputJsonValue,
      actionItems,
      modelVersion: analysis.model,
      promptTokens: analysis.promptTokens,
      completionTokens: analysis.completionTokens,
      rawResponse: analysis.rawResponse as object,
    });

    await aiRepository.markJobCompleted(jobId);
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
