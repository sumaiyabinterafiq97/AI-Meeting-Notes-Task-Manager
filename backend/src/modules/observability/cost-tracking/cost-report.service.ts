import { prisma } from '../../../config/database';
import { costTrackerService } from './cost-tracker.service';

export interface CostSummary {
  totalCostUsd: number;
  invocationCount: number;
  promptTokens: number;
  completionTokens: number;
  embeddingTokens: number;
}

export interface CostLeaderboardEntry {
  workspaceId: string;
  totalCostUsd: number;
  invocationCount: number;
}

export interface CostTrendPoint {
  date: string;
  totalCostUsd: number;
  invocationCount: number;
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Cost reports — summaries, leaderboards, trends from persisted usage data.
 */
export class CostReportService {
  async getWorkspaceDailyCost(workspaceId: string, date = new Date()): Promise<CostSummary> {
    const usageDate = startOfUtcDay(date);
    const row = await prisma.llmUsageDaily.findUnique({
      where: { workspaceId_usageDate: { workspaceId, usageDate } },
    });

    if (!row) {
      return {
        totalCostUsd: 0,
        invocationCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        embeddingTokens: 0,
      };
    }

    return {
      totalCostUsd: Number(row.estimatedCostUsd),
      invocationCount: row.invocationCount,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      embeddingTokens: row.embeddingTokens,
    };
  }

  async getWorkspaceMonthlyCost(workspaceId: string, date = new Date()): Promise<CostSummary> {
    const monthStart = startOfUtcMonth(date);
    const rows = await prisma.llmUsageDaily.findMany({
      where: {
        workspaceId,
        usageDate: { gte: monthStart },
      },
    });

    return rows.reduce<CostSummary>(
      (acc, row) => ({
        totalCostUsd: acc.totalCostUsd + Number(row.estimatedCostUsd),
        invocationCount: acc.invocationCount + row.invocationCount,
        promptTokens: acc.promptTokens + row.promptTokens,
        completionTokens: acc.completionTokens + row.completionTokens,
        embeddingTokens: acc.embeddingTokens + row.embeddingTokens,
      }),
      {
        totalCostUsd: 0,
        invocationCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        embeddingTokens: 0,
      },
    );
  }

  async getCostLeaderboard(limit = 10, days = 7): Promise<CostLeaderboardEntry[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const rows = await prisma.llmUsageDaily.groupBy({
      by: ['workspaceId'],
      where: { usageDate: { gte: since } },
      _sum: { estimatedCostUsd: true, invocationCount: true },
      orderBy: { _sum: { estimatedCostUsd: 'desc' } },
      take: limit,
    });

    return rows.map((row) => ({
      workspaceId: row.workspaceId,
      totalCostUsd: Number(row._sum.estimatedCostUsd ?? 0),
      invocationCount: row._sum.invocationCount ?? 0,
    }));
  }

  async getCostTrend(workspaceId: string, days = 30): Promise<CostTrendPoint[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const rows = await prisma.llmUsageDaily.findMany({
      where: { workspaceId, usageDate: { gte: since } },
      orderBy: { usageDate: 'asc' },
    });

    return rows.map((row) => ({
      date: row.usageDate.toISOString().slice(0, 10),
      totalCostUsd: Number(row.estimatedCostUsd),
      invocationCount: row.invocationCount,
    }));
  }

  async getCostByProvider(workspaceId: string, days = 7): Promise<Record<string, number>> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const invocations = await prisma.llmInvocation.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: { provider: true, estimatedCostUsd: true },
    });

    const byProvider: Record<string, number> = {};
    for (const inv of invocations) {
      byProvider[inv.provider] = (byProvider[inv.provider] ?? 0) + Number(inv.estimatedCostUsd);
    }
    return byProvider;
  }

  estimateLive(model: string, promptTokens: number, completionTokens: number): number {
    return costTrackerService.estimate(model, promptTokens, completionTokens);
  }
}

export const costReportService = new CostReportService();
