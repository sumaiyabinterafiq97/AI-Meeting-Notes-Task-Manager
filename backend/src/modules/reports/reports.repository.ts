import { JobStatus, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

export class ReportsRepository {
  async listReports(workspaceId: string, limit = 20) {
    return prisma.workspaceReport.findMany({
      where: { workspaceId },
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }

  async findReport(workspaceId: string, reportId: string) {
    return prisma.workspaceReport.findFirst({
      where: { id: reportId, workspaceId },
    });
  }

  async createPendingReport(data: {
    workspaceId: string;
    periodStart: Date;
    periodEnd: Date;
    title: string;
  }) {
    return prisma.workspaceReport.create({
      data: {
        workspaceId: data.workspaceId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        title: data.title,
        contentMarkdown: '',
        status: JobStatus.PENDING,
      },
    });
  }

  async completeReport(
    reportId: string,
    data: {
      contentMarkdown: string;
      contentJson: Prisma.InputJsonValue;
      modelVersion: string;
      promptTokens: number;
      completionTokens: number;
    },
  ) {
    return prisma.workspaceReport.update({
      where: { id: reportId },
      data: {
        contentMarkdown: data.contentMarkdown,
        contentJson: data.contentJson,
        modelVersion: data.modelVersion,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        status: JobStatus.COMPLETED,
        generatedAt: new Date(),
      },
    });
  }

  async failReport(reportId: string, message: string) {
    return prisma.workspaceReport.update({
      where: { id: reportId },
      data: {
        status: JobStatus.FAILED,
        contentMarkdown: message,
      },
    });
  }

  async getPeriodStats(workspaceId: string, periodStart: Date, periodEnd: Date) {
    const [meetings, tasksCreated, tasksCompleted, openRisks] = await Promise.all([
      prisma.meeting.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          meetingDate: { gte: periodStart, lte: periodEnd },
        },
        include: { aiOutput: true },
        orderBy: { meetingDate: 'desc' },
      }),
      prisma.task.count({
        where: {
          workspaceId,
          deletedAt: null,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.task.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: TaskStatus.DONE,
          completedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.meetingAiOutput.findMany({
        where: {
          meeting: {
            workspaceId,
            deletedAt: null,
            meetingDate: { gte: periodStart, lte: periodEnd },
          },
        },
        select: { risks: true, meetingId: true },
      }),
    ]);

    const risks = openRisks.flatMap((output) => {
      const items = Array.isArray(output.risks)
        ? (output.risks as Array<{ text: string; severity: string }>)
        : [];
      return items.map((risk) => ({ ...risk, meetingId: output.meetingId }));
    });

    return {
      meetings,
      tasksCreated,
      tasksCompleted,
      risks,
    };
  }

  async assertWorkspace(workspaceId: string) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found');
    }
    return workspace;
  }
}

export const reportsRepository = new ReportsRepository();
