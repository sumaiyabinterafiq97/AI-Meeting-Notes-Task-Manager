export type ReportStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface WeeklyReportSection {
  heading: string;
  content: string;
  meetingIds?: string[];
}

export interface WeeklyReportContent {
  title: string;
  sections: WeeklyReportSection[];
  taskStats: Record<string, number>;
  meetingCount: number;
}

export interface WorkspaceReport {
  id: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  contentMarkdown: string;
  contentJson: WeeklyReportContent | Record<string, unknown>;
  status: ReportStatus;
  modelVersion: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  generatedAt: string | null;
  createdAt: string;
}

export interface GenerateReportPayload {
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportListFilters {
  dateFrom?: string;
  dateTo?: string;
}
