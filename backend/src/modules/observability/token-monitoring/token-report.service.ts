import type { TokenUsageReport } from './token-usage.service';
import { tokenUsageService } from './token-usage.service';

export type { TokenUsageRecord, TokenUsageReport } from './token-usage.service';

/**
 * Token usage reports — workspace summaries and anomaly detection.
 */
export class TokenReportService {
  async getWorkspaceReport(
    workspaceId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<TokenUsageReport> {
    return tokenUsageService.generateReport(workspaceId, period);
  }

  async detectExcessiveUsage(
    workspaceId: string,
    thresholdTokens: number,
  ): Promise<{ exceeded: boolean; currentTokens: number; threshold: number }> {
    const currentTokens = await tokenUsageService.getWorkspaceDailyTotal(workspaceId);
    return { exceeded: currentTokens > thresholdTokens, currentTokens, threshold: thresholdTokens };
  }
}

export const tokenReportService = new TokenReportService();
