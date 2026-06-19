import { JobStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { AgentType } from '../types/agent.types';

export class AgentExecutionService {
  async start(params: {
    jobId?: string;
    workspaceId: string;
    meetingId?: string;
    correlationId: string;
    agentType: AgentType;
  }) {
    return prisma.agentExecution.create({
      data: {
        jobId: params.jobId,
        workspaceId: params.workspaceId,
        meetingId: params.meetingId,
        correlationId: params.correlationId,
        agentType: params.agentType,
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });
  }

  async complete(
    executionId: string,
    params: {
      inputTokens?: number;
      outputTokens?: number;
      latencyMs: number;
      model?: string;
      provider?: string;
    },
  ) {
    return prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        status: JobStatus.COMPLETED,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        latencyMs: params.latencyMs,
        model: params.model,
        provider: params.provider,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async fail(executionId: string, errorMessage: string, latencyMs?: number) {
    return prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        latencyMs,
        completedAt: new Date(),
      },
    });
  }
}

export const agentExecutionService = new AgentExecutionService();
