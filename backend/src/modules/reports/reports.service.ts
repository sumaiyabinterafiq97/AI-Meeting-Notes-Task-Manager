import { weeklyReportAgent } from '../agents/weekly-report/services/weekly-report.service';
import { reportsRepository } from './reports.repository';
import { AppError, ErrorCodes } from '../../utils/errors';

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildMarkdown(output: {
  title: string;
  sections: Array<{ heading: string; content: string }>;
}): string {
  return [
    `# ${output.title}`,
    '',
    ...output.sections.flatMap((section) => [`## ${section.heading}`, '', section.content, '']),
  ].join('\n');
}

function defaultPeriod() {
  const periodEnd = new Date();
  periodEnd.setUTCHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 6);
  periodStart.setUTCHours(0, 0, 0, 0);
  return { periodStart, periodEnd };
}

export class ReportsService {
  async listReports(workspaceId: string) {
    await reportsRepository.assertWorkspace(workspaceId);
    return reportsRepository.listReports(workspaceId);
  }

  async getReport(workspaceId: string, reportId: string) {
    const report = await reportsRepository.findReport(workspaceId, reportId);
    if (!report) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Report not found');
    }
    return report;
  }

  async generateReport(
    workspaceId: string,
    options?: { dateFrom?: string; dateTo?: string },
  ) {
    const workspace = await reportsRepository.assertWorkspace(workspaceId);

    const defaults = defaultPeriod();
    const periodStart = options?.dateFrom ? new Date(options.dateFrom) : defaults.periodStart;
    const periodEnd = options?.dateTo ? new Date(options.dateTo) : defaults.periodEnd;

    const stats = await reportsRepository.getPeriodStats(workspaceId, periodStart, periodEnd);

    const taskStats = {
      created: stats.tasksCreated,
      completed: stats.tasksCompleted,
      open: stats.tasksOpen,
      overdue: stats.tasksOverdue,
    };

    const meetingSummaries = stats.meetings
      .map(
        (meeting) =>
          `- ${meeting.title} (${toDateOnly(meeting.meetingDate)}): ${meeting.aiOutput?.summary ?? 'No summary'}`,
      )
      .join('\n');

    const openRisks = stats.risks
      .map((risk) => `- [${risk.severity}] ${risk.text}`)
      .join('\n');

    const pending = await reportsRepository.createPendingReport({
      workspaceId,
      periodStart,
      periodEnd,
      title: `Weekly Report ${toDateOnly(periodStart)} – ${toDateOnly(periodEnd)}`,
    });

    try {
      const generated = await weeklyReportAgent.generate(
        {
          workspaceId,
          workspaceName: workspace.name,
          dateFrom: toDateOnly(periodStart),
          dateTo: toDateOnly(periodEnd),
          correlationId: pending.id,
        },
        {
          meetingSummaries,
          taskStats,
          openRisks,
          meetingCount: stats.meetings.length,
          workspaceName: workspace.name,
        },
      );

      const markdown = buildMarkdown(generated.output);

      return reportsRepository.completeReport(pending.id, {
        contentMarkdown: markdown,
        contentJson: generated.output as object,
        modelVersion: generated.model,
        promptTokens: generated.promptTokens,
        completionTokens: generated.completionTokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Report generation failed';
      await reportsRepository.failReport(pending.id, message);
      throw error;
    }
  }
}

export const reportsService = new ReportsService();
