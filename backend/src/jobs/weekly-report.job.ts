import { reportsService } from '../modules/reports/reports.service';

export async function processWeeklyReportJob(payload: {
  workspaceId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<void> {
  await reportsService.generateReport(payload.workspaceId, {
    dateFrom: payload.dateFrom,
    dateTo: payload.dateTo,
  });
}
