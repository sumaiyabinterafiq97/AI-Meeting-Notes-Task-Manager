import { LlmInvocationStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { env } from '../../../config/env';
import { LLMTokenBudgetError } from '../../llm/errors/llm.errors';
import { costTrackerService } from '../cost-tracking/cost-tracker.service';
import { metricsService } from '../metrics/metrics.service';
import { structuredLogger } from '../logging/structured-logger';
import { latencyTrackerService } from '../latency/latency-tracker.service';

export interface TokenUsageRecord {
  workspaceId: string;
  userId?: string;
  agentId?: string;
  workflow: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  contextTokens?: number;
  embeddingTokens?: number;
  estimatedCostUsd: number;
  latencyMs?: number;
  correlationId?: string;
  requestId?: string;
  promptId?: string;
  promptVersion?: string;
  status?: LlmInvocationStatus;
  errorMessage?: string;
}

export interface TokenUsageReport {
  workspaceId: string;
  period: 'day' | 'week' | 'month';
  inputTokens: number;
  outputTokens: number;
  embeddingTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  invocationCount: number;
  byModel: Record<string, number>;
  byProvider: Record<string, number>;
  byAgent: Record<string, number>;
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * TokenUsageService — per-request token accounting, budget enforcement, and reports.
 */
export class TokenUsageService {
  async record(usage: TokenUsageRecord): Promise<void> {
    const totalTokens = usage.promptTokens + usage.completionTokens;
    const embeddingTokens = usage.embeddingTokens ?? (usage.workflow === 'embed' ? totalTokens : 0);
    const estimatedCostUsd =
      usage.estimatedCostUsd ||
      costTrackerService.estimateDetailed({
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        embeddingTokens,
      }).estimatedCostUsd;

    await prisma.llmInvocation.create({
      data: {
        workspaceId: usage.workspaceId,
        workflow: usage.workflow,
        provider: usage.provider,
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens,
        estimatedCostUsd,
        latencyMs: usage.latencyMs,
        status: usage.status ?? LlmInvocationStatus.COMPLETED,
        errorMessage: usage.errorMessage,
        correlationId: usage.correlationId,
        requestId: usage.requestId,
        promptId: usage.promptId,
        promptVersion: usage.promptVersion,
      },
    });

    const usageDate = startOfUtcDay();

    await prisma.llmUsageDaily.upsert({
      where: {
        workspaceId_usageDate: {
          workspaceId: usage.workspaceId,
          usageDate,
        },
      },
      create: {
        workspaceId: usage.workspaceId,
        usageDate,
        promptTokens: usage.workflow === 'embed' ? 0 : usage.promptTokens,
        completionTokens: usage.workflow === 'embed' ? 0 : usage.completionTokens,
        embeddingTokens,
        estimatedCostUsd,
        invocationCount: 1,
      },
      update: {
        promptTokens: {
          increment: usage.workflow === 'embed' ? 0 : usage.promptTokens,
        },
        completionTokens: {
          increment: usage.workflow === 'embed' ? 0 : usage.completionTokens,
        },
        embeddingTokens: { increment: embeddingTokens },
        estimatedCostUsd: { increment: estimatedCostUsd },
        invocationCount: { increment: 1 },
      },
    });

    const labels = {
      workspaceId: usage.workspaceId,
      userId: usage.userId,
      model: usage.model,
      provider: usage.provider,
      agent: usage.agentId,
      workflow: usage.workflow,
    };

    metricsService.setGauge('context.tokens', usage.contextTokens ?? usage.promptTokens, labels);

    if (usage.latencyMs !== undefined) {
      latencyTrackerService.record('llm.completion', usage.latencyMs, labels);
    }

    structuredLogger.info(
      {
        requestId: usage.requestId,
        correlationId: usage.correlationId,
        workspaceId: usage.workspaceId,
        userId: usage.userId,
        model: usage.model,
        provider: usage.provider,
        tokens: totalTokens,
        latencyMs: usage.latencyMs,
        cost: estimatedCostUsd,
        workflow: usage.workflow,
        agent: usage.agentId,
        status: usage.status ?? 'COMPLETED',
      },
      'token usage recorded',
    );
  }

  async getWorkspaceDailyTotal(workspaceId: string): Promise<number> {
    const usageDate = startOfUtcDay();
    const row = await prisma.llmUsageDaily.findUnique({
      where: { workspaceId_usageDate: { workspaceId, usageDate } },
    });

    if (!row) return 0;
    return row.promptTokens + row.completionTokens + row.embeddingTokens;
  }

  async assertWorkspaceBudget(workspaceId: string, additionalTokens = 0): Promise<void> {
    const current = await this.getWorkspaceDailyTotal(workspaceId);
    if (current + additionalTokens > env.WORKSPACE_DAILY_TOKEN_BUDGET) {
      metricsService.recordRateLimitViolation({ workspaceId });
      throw new LLMTokenBudgetError('Workspace AI token budget exceeded');
    }
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    return costTrackerService.estimate(model, promptTokens, completionTokens);
  }

  async generateReport(
    workspaceId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<TokenUsageReport> {
    const since = new Date();
    if (period === 'week') since.setUTCDate(since.getUTCDate() - 7);
    else if (period === 'month') since.setUTCMonth(since.getUTCMonth() - 1);
    else since.setUTCHours(0, 0, 0, 0);

    const [dailyRows, invocations] = await Promise.all([
      prisma.llmUsageDaily.findMany({
        where: { workspaceId, usageDate: { gte: since } },
      }),
      prisma.llmInvocation.findMany({
        where: { workspaceId, createdAt: { gte: since } },
        select: { model: true, provider: true, workflow: true, totalTokens: true },
      }),
    ]);

    const inputTokens = dailyRows.reduce((sum, r) => sum + r.promptTokens, 0);
    const outputTokens = dailyRows.reduce((sum, r) => sum + r.completionTokens, 0);
    const embeddingTokens = dailyRows.reduce((sum, r) => sum + r.embeddingTokens, 0);
    const estimatedCostUsd = dailyRows.reduce((sum, r) => sum + Number(r.estimatedCostUsd), 0);
    const invocationCount = dailyRows.reduce((sum, r) => sum + r.invocationCount, 0);

    const byModel: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    for (const inv of invocations) {
      byModel[inv.model] = (byModel[inv.model] ?? 0) + inv.totalTokens;
      byProvider[inv.provider] = (byProvider[inv.provider] ?? 0) + inv.totalTokens;
      byAgent[inv.workflow] = (byAgent[inv.workflow] ?? 0) + inv.totalTokens;
    }

    return {
      workspaceId,
      period,
      inputTokens,
      outputTokens,
      embeddingTokens,
      totalTokens: inputTokens + outputTokens + embeddingTokens,
      estimatedCostUsd,
      invocationCount,
      byModel,
      byProvider,
      byAgent,
    };
  }
}

export const tokenUsageService = new TokenUsageService();
