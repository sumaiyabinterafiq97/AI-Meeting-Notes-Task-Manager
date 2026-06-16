import {
  DashboardActivityDto,
  DashboardDto,
  WeeklyCompletionDto,
} from './dashboard.dto';
import { dashboardRepository, PRODUCTIVITY_WEEKS } from './dashboard.repository';
import { toIsoWeek, weeksAgoUtc } from '../../lib/week';

function buildWeeklyCompletions(
  tasks: Array<{ completedAt: Date | null }>,
): WeeklyCompletionDto[] {
  const since = weeksAgoUtc(PRODUCTIVITY_WEEKS - 1);
  const buckets = new Map<string, number>();

  for (let i = 0; i < PRODUCTIVITY_WEEKS; i++) {
    const weekDate = new Date(since);
    weekDate.setUTCDate(weekDate.getUTCDate() + i * 7);
    buckets.set(toIsoWeek(weekDate), 0);
  }

  for (const task of tasks) {
    if (!task.completedAt) {
      continue;
    }

    const week = toIsoWeek(task.completedAt);
    if (buckets.has(week)) {
      buckets.set(week, (buckets.get(week) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([week, count]) => ({ week, count }));
}

function computeAvgDaysToComplete(
  tasks: Array<{ createdAt: Date; completedAt: Date | null }>,
): number | null {
  const durations = tasks
    .filter((task): task is { createdAt: Date; completedAt: Date } => task.completedAt !== null)
    .map((task) => (task.completedAt.getTime() - task.createdAt.getTime()) / 86400000);

  if (durations.length === 0) {
    return null;
  }

  const avg = durations.reduce((sum, days) => sum + days, 0) / durations.length;
  return Math.round(avg * 10) / 10;
}

function toActivityDto(entry: {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
  actor: { displayName: string };
}): DashboardActivityDto {
  return {
    id: entry.id,
    action: entry.action,
    actor: { displayName: entry.actor.displayName },
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
  };
}

export class DashboardService {
  async getDashboard(workspaceId: string): Promise<DashboardDto> {
    const since = weeksAgoUtc(PRODUCTIVITY_WEEKS - 1);

    const [stats, completedTasks, recentActivity] = await Promise.all([
      dashboardRepository.getStats(workspaceId),
      dashboardRepository.getCompletedTasksForProductivity(workspaceId, since),
      dashboardRepository.getRecentActivity(workspaceId),
    ]);

    return {
      stats,
      productivity: {
        tasksCompletedPerWeek: buildWeeklyCompletions(completedTasks),
        avgDaysToComplete: computeAvgDaysToComplete(completedTasks),
      },
      recentActivity: recentActivity.map(toActivityDto),
    };
  }
}

export const dashboardService = new DashboardService();
