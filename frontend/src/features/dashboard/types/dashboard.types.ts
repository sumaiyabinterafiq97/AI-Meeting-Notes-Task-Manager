export interface DashboardStats {
  totalMeetings: number;
  openTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
}

export interface DashboardAiMetrics {
  summariesGenerated: number;
  pendingActionItems: number;
  failedProcessing: number;
}

export type DashboardRecommendationType = 'risk' | 'action_item' | 'follow_up' | 'backlog';

export interface DashboardRecommendation {
  id: string;
  type: DashboardRecommendationType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  meetingId?: string;
  meetingTitle?: string;
}

export interface DashboardTaskDueSoon {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  isOverdue: boolean;
}

export interface DashboardRecentMeeting {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  hasAiSummary: boolean;
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
  aiMetrics: DashboardAiMetrics;
  recommendations: DashboardRecommendation[];
  tasksDueSoon: DashboardTaskDueSoon[];
  recentMeetings: DashboardRecentMeeting[];
  productivity: {
    tasksCompletedPerWeek: WeeklyCompletion[];
    avgDaysToComplete: number | null;
  };
  recentActivity: DashboardActivity[];
}

export interface WorkspaceInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  metric?: Record<string, number>;
}

export interface WorkspaceInsightsData {
  insights: WorkspaceInsight[];
  narrative?: string;
  generatedAt: string;
}
