export interface WeeklyReportInput {
  workspaceId: string;
  dateFrom: string;
  dateTo: string;
  correlationId?: string;
}

export interface WeeklyReportSection {
  heading: string;
  content: string;
  meetingIds?: string[];
}

export interface WeeklyReportOutput {
  title: string;
  sections: WeeklyReportSection[];
  taskStats: Record<string, number>;
  meetingCount: number;
}
