import { randomUUID } from 'crypto';
import { ragService, contextBuilderService } from '../../../rag';
import { promptRegistry } from '../../../prompts/services/prompt-registry.service';
import { completeStructured } from '../../schemas/structured-output.service';
import { inputSanitizerService } from '../../security/input-sanitizer.service';
import { agentExecutionService } from '../../services/agent-execution.service';
import { createAgentMessage } from '../../services/agent-runner.service';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type {
  WeeklyReportContext,
  WeeklyReportInput,
  WeeklyReportOutput,
} from '../types/weekly-report.types';
import {
  buildLowActivityWeeklyReportOutput,
  enrichWeeklyReportOutput,
} from './weekly-report.validator';
import { FALLBACK_WEEKLY_REPORT_OUTPUT } from './weekly-report.constants';

function toPeriodEnd(date: string): string {
  return date.includes('T') ? date : `${date}T23:59:59.999Z`;
}

export class WeeklyReportAgentService implements IAgent<WeeklyReportInput, WeeklyReportOutput> {
  readonly type = 'weekly-report' as const;

  private sanitizeInput(input: WeeklyReportInput): WeeklyReportInput {
    return {
      ...input,
      workspaceName: input.workspaceName
        ? inputSanitizerService.sanitizeText(input.workspaceName, { field: 'promptVar', maxLength: 120 })
        : input.workspaceName,
      meetingSummaries: input.meetingSummaries
        ? inputSanitizerService.sanitizeText(input.meetingSummaries, { field: 'promptVar' })
        : input.meetingSummaries,
      openRisks: input.openRisks
        ? inputSanitizerService.sanitizeText(input.openRisks, { field: 'promptVar' })
        : input.openRisks,
    };
  }

  private buildContextFromInput(input: WeeklyReportInput): WeeklyReportContext {
    return {
      meetingSummaries: input.meetingSummaries ?? '',
      taskStats: input.taskStats ?? { created: 0, completed: 0, open: 0, overdue: 0 },
      openRisks: input.openRisks ?? '',
      meetingCount: input.meetingCount ?? 0,
      workspaceName: input.workspaceName,
    };
  }

  private buildUserContent(context: WeeklyReportContext, dateFrom: string, dateTo: string, retrievedContext: string): string {
    return [
      `Period: ${dateFrom} to ${dateTo}`,
      `Meeting count: ${context.meetingCount}`,
      `Task stats: ${JSON.stringify(context.taskStats)}`,
      '',
      'Meeting summaries:',
      context.meetingSummaries || 'No meetings in period.',
      '',
      'Open risks:',
      context.openRisks || 'None recorded.',
      '',
      'Retrieved context:',
      retrievedContext || 'No additional context retrieved.',
    ].join('\n');
  }

  async generate(
    input: WeeklyReportInput,
    context: WeeklyReportContext,
  ): Promise<{
    output: WeeklyReportOutput;
    model: string;
    provider: string;
    promptTokens: number;
    completionTokens: number;
  }> {
    const startedAt = Date.now();
    const sanitizedInput = this.sanitizeInput(input);
    const correlationId = sanitizedInput.correlationId ?? randomUUID();

    const execution = await agentExecutionService.start({
      workspaceId: sanitizedInput.workspaceId,
      correlationId,
      agentType: this.type,
    });

    const enrichmentContext = {
      ...context,
      dateFrom: sanitizedInput.dateFrom,
      dateTo: sanitizedInput.dateTo,
      workspaceName: sanitizedInput.workspaceName ?? context.workspaceName,
    };

    if (context.meetingCount < 1) {
      const output = buildLowActivityWeeklyReportOutput(enrichmentContext);
      const latencyMs = Date.now() - startedAt;

      await agentExecutionService.complete(execution.id, {
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        model: 'none',
        provider: 'none',
      });

      return {
        output,
        model: 'none',
        provider: 'none',
        promptTokens: 0,
        completionTokens: 0,
      };
    }

    try {
      const ragContext = await ragService.buildContext(
        {
          query: `workspace activity between ${sanitizedInput.dateFrom} and ${sanitizedInput.dateTo}`,
          workspaceId: sanitizedInput.workspaceId,
          mode: 'hybrid',
          topK: 25,
          dateFrom: sanitizedInput.dateFrom,
          dateTo: toPeriodEnd(sanitizedInput.dateTo),
        },
        { useCase: 'weekly' },
      );
      const retrievedContext = contextBuilderService.formatBlocks(ragContext.blocks);

      const rendered = promptRegistry.render('weekly-report', {
        variables: {
          workspaceId: sanitizedInput.workspaceId,
          workspaceName: sanitizedInput.workspaceName ?? context.workspaceName ?? 'Workspace',
          dateFrom: sanitizedInput.dateFrom,
          dateTo: sanitizedInput.dateTo,
          retrievedContext,
          taskStats: JSON.stringify(context.taskStats),
          meetingCount: String(context.meetingCount),
        },
      });

      const systemContent =
        rendered?.messages[0]?.content ??
        'You generate weekly workspace intelligence reports. Return valid JSON only.';

      const userContent = inputSanitizerService.wrapUntrustedContent(
        'USER_INPUT',
        this.buildUserContent(context, sanitizedInput.dateFrom, sanitizedInput.dateTo, retrievedContext),
      );

      const { response, parsed } = await completeStructured<WeeklyReportOutput>(
        'weekly-report',
        {
          workflow: 'weekly-report',
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userContent },
          ],
          workspaceId: sanitizedInput.workspaceId,
          correlationId,
        },
        {
          promptId: 'weekly-report',
          promptVersion: rendered?.version ?? '1.0.0',
        },
      );

      const output = enrichWeeklyReportOutput(parsed, {
        ...enrichmentContext,
        contextBlocks: ragContext.blocks,
      });

      const latencyMs = Date.now() - startedAt;

      await agentExecutionService.complete(execution.id, {
        inputTokens: response.promptTokens,
        outputTokens: response.completionTokens,
        latencyMs,
        model: response.model,
        provider: response.provider,
      });

      return {
        output,
        model: response.model,
        provider: response.provider,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Weekly report generation failed';

      await agentExecutionService.fail(execution.id, message, latencyMs);

      const fallbackOutput = enrichWeeklyReportOutput(
        {
          ...FALLBACK_WEEKLY_REPORT_OUTPUT,
          taskStats: context.taskStats,
          meetingCount: context.meetingCount,
        },
        enrichmentContext,
      );

      return {
        output: fallbackOutput,
        model: 'fallback',
        provider: 'none',
        promptTokens: 0,
        completionTokens: 0,
      };
    }
  }

  async execute(
    message: AgentMessage<WeeklyReportInput, WeeklyReportOutput>,
  ): Promise<AgentMessage<WeeklyReportInput, WeeklyReportOutput>> {
    const startedAt = Date.now();
    const context = this.buildContextFromInput(message.input);
    const generated = await this.generate(message.input, context);

    return {
      ...message,
      output: generated.output,
      status: 'completed',
      metrics: {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        promptTokens: generated.promptTokens,
        completionTokens: generated.completionTokens,
        model: generated.model,
        provider: generated.provider,
      },
    };
  }
}

export const weeklyReportAgent = new WeeklyReportAgentService();

export function buildWeeklyReportMessage(
  input: WeeklyReportInput,
  options?: { correlationId?: string },
) {
  return createAgentMessage('weekly-report', input.workspaceId, input, {
    correlationId: options?.correlationId ?? input.correlationId ?? randomUUID(),
  });
}

export function buildWeeklyReportCorrelationId(): string {
  return randomUUID();
}
