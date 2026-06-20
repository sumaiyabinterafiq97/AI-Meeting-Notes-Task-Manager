export interface WeeklyReportInput {
  workspaceId: string;
  dateFrom: string;
  dateTo: string;
  correlationId?: string;
  workspaceName?: string;
  meetingSummaries?: string;
  taskStats?: Record<string, number>;
  openRisks?: string;
  meetingCount?: number;
}

export interface WeeklyReportCitation {
  index: number;
  chunkId?: string;
  meetingId?: string;
}

export interface WeeklyReportSection {
  heading: string;
  content: string;
  meetingIds?: string[];
  citations?: WeeklyReportCitation[];
}

/** Canonical weekly report output — v2.0 fields plus optional v2.1 section citations. */
export interface WeeklyReportOutput {
  title: string;
  sections: WeeklyReportSection[];
  taskStats: Record<string, number>;
  meetingCount: number;
  citationCount?: number;
}

export interface WeeklyReportContext {
  meetingSummaries: string;
  taskStats: Record<string, number>;
  openRisks: string;
  meetingCount: number;
  workspaceName?: string;
}

export interface WeeklyReportValidationResult {
  valid: boolean;
  warnings: string[];
  invalidMeetingIds: string[];
  orphanCitationIndices: number[];
}
