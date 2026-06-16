import { TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { startOfUtcWeek } from '../../lib/week';

const RECENT_ACTIVITY_LIMIT = 20;
const PRODUCTIVITY_WEEKS = 8;
const ACTIVITY_LOOKBACK_DAYS = 30;

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
