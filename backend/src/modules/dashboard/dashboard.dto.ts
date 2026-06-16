export interface DashboardStatsDto {
  totalMeetings: number;
  openTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
}

export interface WeeklyCompletionDto {
  week: string;
  count: number;
}

export interface DashboardActivityDto {
  id: string;
  action: string;
  actor: { displayName: string };
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}

export interface DashboardDto {
  stats: DashboardStatsDto;
  productivity: {
    tasksCompletedPerWeek: WeeklyCompletionDto[];
    avgDaysToComplete: number | null;
  };
  recentActivity: DashboardActivityDto[];
}
