export interface DashboardStats {
  totalMeetings: number;
  openTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
}

export interface WeeklyCompletion {
  week: string;
  count: number;
}

export interface DashboardActivity {
  id: string;
  action: string;
  actor: { displayName: string };
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
}

export interface DashboardData {
  stats: DashboardStats;
  productivity: {
    tasksCompletedPerWeek: WeeklyCompletion[];
    avgDaysToComplete: number | null;
  };
  recentActivity: DashboardActivity[];
}
