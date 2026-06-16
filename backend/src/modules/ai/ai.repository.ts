import {
  ActionItemStatus,
  JobStatus,
  MeetingStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/database';

export class AiRepository {
  async findActiveJobForMeeting(meetingId: string) {
    return prisma.aiProcessingJob.findFirst({
      where: {
        meetingId,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJob(data: {
    meetingId: string;
    workspaceId: string;
    idempotencyKey?: string;
  }) {
    return prisma.aiProcessingJob.create({
      data: {
        meetingId: data.meetingId,
        workspaceId: data.workspaceId,
        idempotencyKey: data.idempotencyKey,
      },
    });
  }

  async findJobById(jobId: string) {
    return prisma.aiProcessingJob.findUnique({ where: { id: jobId } });
  }

  async markJobProcessing(jobId: string) {
    return prisma.aiProcessingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROCESSING,
        attemptCount: { increment: 1 },
        startedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markJobCompleted(jobId: string) {
    return prisma.aiProcessingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markJobFailed(jobId: string, errorMessage: string) {
    return prisma.aiProcessingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      },
    });
  }

  async resetJobForRetry(jobId: string, errorMessage: string) {
    return prisma.aiProcessingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PENDING,
        errorMessage,
      },
    });
  }

  async setBullJobId(jobId: string, bullJobId: string) {
    return prisma.aiProcessingJob.update({
      where: { id: jobId },
      data: { bullJobId },
    });
  }

  async getMeetingForProcessing(meetingId: string) {
    return prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
      include: { transcript: true },
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async saveProcessingResult(data: {
    meetingId: string;
    summary: string;
    topics: string[];
    decisions: Prisma.InputJsonValue;
    risks: Prisma.InputJsonValue;
    actionItems: Array<{
      title: string;
      description: string;
      suggestedAssigneeId: string | null;
      suggestedDueDate: Date | null;
    }>;
    modelVersion: string;
    promptTokens: number | null;
    completionTokens: number | null;
    rawResponse: Prisma.InputJsonValue;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.actionItemSuggestion.deleteMany({
        where: {
          meetingId: data.meetingId,
          status: ActionItemStatus.PENDING,
        },
      });

      await tx.meetingAiOutput.upsert({
        where: { meetingId: data.meetingId },
        create: {
          meetingId: data.meetingId,
          summary: data.summary,
          topics: data.topics,
          decisions: data.decisions,
          risks: data.risks,
          rawResponse: data.rawResponse,
          processingStatus: 'COMPLETED',
          modelVersion: data.modelVersion,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          processedAt: new Date(),
          errorMessage: null,
        },
        update: {
          summary: data.summary,
          topics: data.topics,
          decisions: data.decisions,
          risks: data.risks,
          rawResponse: data.rawResponse,
          processingStatus: 'COMPLETED',
          modelVersion: data.modelVersion,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      if (data.actionItems.length > 0) {
        await tx.actionItemSuggestion.createMany({
          data: data.actionItems.map((item) => ({
            meetingId: data.meetingId,
            title: item.title,
            description: item.description,
            suggestedAssigneeId: item.suggestedAssigneeId,
            suggestedDueDate: item.suggestedDueDate,
            status: ActionItemStatus.PENDING,
          })),
        });
      }

      return tx.meeting.update({
        where: { id: data.meetingId },
        data: { status: MeetingStatus.READY },
      });
    });
  }

  async markMeetingFailed(meetingId: string, errorMessage: string) {
    return prisma.$transaction(async (tx) => {
      await tx.meetingAiOutput.upsert({
        where: { meetingId },
        create: {
          meetingId,
          processingStatus: 'FAILED',
          errorMessage,
        },
        update: {
          processingStatus: 'FAILED',
          errorMessage,
        },
      });

      return tx.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.FAILED },
      });
    });
  }

  async findAiOutputInWorkspace(workspaceId: string, meetingId: string) {
    return prisma.meetingAiOutput.findFirst({
      where: {
        meetingId,
        meeting: {
          workspaceId,
          deletedAt: null,
        },
      },
    });
  }

  async updateAiOutput(
    workspaceId: string,
    meetingId: string,
    data: Prisma.MeetingAiOutputUpdateInput,
  ) {
    const existing = await this.findAiOutputInWorkspace(workspaceId, meetingId);
    if (!existing) {
      return null;
    }

    return prisma.meetingAiOutput.update({
      where: { meetingId },
      data,
    });
  }

  async listActionItems(workspaceId: string, meetingId: string) {
    return prisma.actionItemSuggestion.findMany({
      where: {
        meetingId,
        meeting: {
          workspaceId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActionItemsByIds(
    workspaceId: string,
    meetingId: string,
    actionItemIds: string[],
  ) {
    return prisma.actionItemSuggestion.findMany({
      where: {
        id: { in: actionItemIds },
        meetingId,
        meeting: {
          workspaceId,
          deletedAt: null,
        },
      },
    });
  }

  async findExistingTasksByActionItemIds(actionItemIds: string[]) {
    return prisma.task.findMany({
      where: {
        actionItemId: { in: actionItemIds },
        deletedAt: null,
      },
    });
  }

  async acceptActionItems(data: {
    workspaceId: string;
    meetingId: string;
    createdById: string;
    items: Array<{
      actionItemId: string;
      title: string;
      description: string | null;
      assigneeId: string | null;
      dueDate: Date | null;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const tasks: Array<{ task: Awaited<ReturnType<typeof tx.task.create>>; created: boolean }> =
        [];

      for (const item of data.items) {
        const existing = await tx.task.findFirst({
          where: { actionItemId: item.actionItemId, deletedAt: null },
        });

        if (existing) {
          tasks.push({ task: existing, created: false });
          continue;
        }

        const task = await tx.task.create({
          data: {
            workspaceId: data.workspaceId,
            meetingId: data.meetingId,
            actionItemId: item.actionItemId,
            createdById: data.createdById,
            assigneeId: item.assigneeId,
            title: item.title,
            description: item.description,
            dueDate: item.dueDate,
          },
        });

        await tx.actionItemSuggestion.update({
          where: { id: item.actionItemId },
          data: { status: ActionItemStatus.ACCEPTED },
        });

        tasks.push({ task, created: true });
      }

      return tasks;
    });
  }

  async rejectActionItems(actionItemIds: string[]) {
    const result = await prisma.actionItemSuggestion.updateMany({
      where: {
        id: { in: actionItemIds },
        status: ActionItemStatus.PENDING,
      },
      data: { status: ActionItemStatus.REJECTED },
    });

    return result.count;
  }
}

export const aiRepository = new AiRepository();
