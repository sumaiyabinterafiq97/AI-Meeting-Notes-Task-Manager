import { processWeeklyReportJob } from '../../../jobs/weekly-report.job';

export async function processWeeklyReportJobProcessor(payload: {
  workspaceId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<void> {
  await processWeeklyReportJob(payload);
}
