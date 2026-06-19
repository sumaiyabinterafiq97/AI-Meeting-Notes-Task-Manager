import { LlmInvocationStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { env } from '../../../config/env';
import { costTrackerService } from '../../observability/cost-tracking/cost-tracker.service';
import { LLMTokenBudgetError } from '../../llm/errors/llm.errors';

export interface TokenUsageRecord {
  workspaceId: string;
  workflow: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencyMs?: number;
  correlationId?: string;
  requestId?: string;
  promptId?: string;
  promptVersion?: string;
  status?: LlmInvocationStatus;
  errorMessage?: string;
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export class TokenMonitorService {
  async record(usage: TokenUsageRecord): Promise<void> {
    const totalTokens = usage.promptTokens + usage.completionTokens;
    const estimatedCostUsd = usage.estimatedCostUsd;

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
        embeddingTokens: usage.workflow === 'embed' ? totalTokens : 0,
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
        embeddingTokens: {
          increment: usage.workflow === 'embed' ? totalTokens : 0,
        },
        estimatedCostUsd: { increment: estimatedCostUsd },
        invocationCount: { increment: 1 },
      },
    });
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
      throw new LLMTokenBudgetError('Workspace AI token budget exceeded');
    }
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    return costTrackerService.estimate(model, promptTokens, completionTokens);
  }
}

export const tokenMonitorService = new TokenMonitorService();
