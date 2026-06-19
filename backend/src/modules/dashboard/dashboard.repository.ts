import { ActionItemStatus, AiProcessingStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { startOfUtcWeek } from '../../lib/week';

const RECENT_ACTIVITY_LIMIT = 20;
const PRODUCTIVITY_WEEKS = 8;
const ACTIVITY_LOOKBACK_DAYS = 30;
const TASKS_DUE_SOON_LIMIT = 5;
const RECENT_MEETINGS_LIMIT = 5;
const TASKS_DUE_SOON_DAYS = 7;

export class DashboardRepository {
  async getStats(workspaceId: string) {
    const weekStart = startOfUtcWeek(new Date());
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [totalMeetings, openTasks, overdueTasks, completedThisWeek] = await Promise.all([
      prisma.meeting.count({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.task.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: { not: TaskStatus.DONE },
        },
      }),
      prisma.task.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: today },
        },
      }),
      prisma.task.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: TaskStatus.DONE,
          completedAt: { gte: weekStart },
        },
      }),
    ]);

    return { totalMeetings, openTasks, overdueTasks, completedThisWeek };
  }

  async getAiMetrics(workspaceId: string) {
    const [summariesGenerated, pendingActionItems, failedProcessing] = await Promise.all([
      prisma.meetingAiOutput.count({
        where: {
          processingStatus: AiProcessingStatus.COMPLETED,
          summary: { not: null },
          meeting: { workspaceId, deletedAt: null },
        },
      }),
      prisma.actionItemSuggestion.count({
        where: {
          status: ActionItemStatus.PENDING,
          meeting: { workspaceId, deletedAt: null },
        },
      }),
      prisma.meeting.count({
        where: { workspaceId, deletedAt: null, status: 'FAILED' },
      }),
    ]);

    return { summariesGenerated, pendingActionItems, failedProcessing };
  }

  async getPendingActionsByMeeting(workspaceId: string) {
    const grouped = await prisma.actionItemSuggestion.groupBy({
      by: ['meetingId'],
      where: {
        status: ActionItemStatus.PENDING,
        meeting: { workspaceId, deletedAt: null },
      },
      _count: { id: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        id: { in: grouped.map((entry) => entry.meetingId) },
        workspaceId,
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    const titleById = new Map(meetings.map((meeting) => [meeting.id, meeting.title]));

    return grouped
      .map((entry) => ({
        meetingId: entry.meetingId,
        meetingTitle: titleById.get(entry.meetingId) ?? 'Untitled meeting',
        count: entry._count.id,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getMeetingsWithRisks(workspaceId: string, limit = 8) {
    return prisma.meeting.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        aiOutput: { processingStatus: AiProcessingStatus.COMPLETED },
      },
      orderBy: { meetingDate: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        aiOutput: { select: { risks: true } },
      },
    });
  }

  async getTasksDueSoon(workspaceId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const horizon = new Date(today);
    horizon.setUTCDate(horizon.getUTCDate() + TASKS_DUE_SOON_DAYS);

    return prisma.task.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: { not: TaskStatus.DONE },
        dueDate: { not: null, lte: horizon },
      },
      orderBy: [{ dueDate: 'asc' }],
      take: TASKS_DUE_SOON_LIMIT,
      include: {
        assignee: { select: { displayName: true } },
      },
    });
  }

  async getRecentMeetings(workspaceId: string) {
    return prisma.meeting.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { meetingDate: 'desc' },
      take: RECENT_MEETINGS_LIMIT,
      select: {
        id: true,
        title: true,
        meetingDate: true,
        status: true,
        aiOutput: {
          select: {
            processingStatus: true,
            summary: true,
          },
        },
      },
    });
  }

  async getCompletedTasksForProductivity(workspaceId: string, since: Date) {
    return prisma.task.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: TaskStatus.DONE,
        completedAt: { gte: since, not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });
  }

  async getRecentActivity(workspaceId: string) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - ACTIVITY_LOOKBACK_DAYS);

    return prisma.activityLog.findMany({
      where: {
        workspaceId,
        createdAt: { gte: since },
      },
      include: {
        actor: {
          select: { displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
    });
  }
}

export const dashboardRepository = new DashboardRepository();
export { PRODUCTIVITY_WEEKS };
