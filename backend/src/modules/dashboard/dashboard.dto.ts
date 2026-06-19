export interface DashboardStatsDto {
  totalMeetings: number;
  openTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
}

export interface DashboardAiMetricsDto {
  summariesGenerated: number;
  pendingActionItems: number;
  failedProcessing: number;
}

export type DashboardRecommendationType = 'risk' | 'action_item' | 'follow_up' | 'backlog';

export interface DashboardRecommendationDto {
  id: string;
  type: DashboardRecommendationType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  meetingId?: string;
  meetingTitle?: string;
}

export interface DashboardTaskDueSoonDto {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  isOverdue: boolean;
}

export interface DashboardRecentMeetingDto {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  hasAiSummary: boolean;
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
  aiMetrics: DashboardAiMetricsDto;
  recommendations: DashboardRecommendationDto[];
  tasksDueSoon: DashboardTaskDueSoonDto[];
  recentMeetings: DashboardRecentMeetingDto[];
  productivity: {
    tasksCompletedPerWeek: WeeklyCompletionDto[];
    avgDaysToComplete: number | null;
  };
  recentActivity: DashboardActivityDto[];
}
