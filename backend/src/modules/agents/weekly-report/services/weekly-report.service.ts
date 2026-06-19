import { randomUUID } from 'crypto';
import { llmService } from '../../../llm';
import { ragService } from '../../../rag';
import { promptRegistry } from '../../../prompts/services/prompt-registry.service';
import { WEEKLY_REPORT_OUTPUT_SCHEMA } from '../../schemas/agent-schemas';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { WeeklyReportInput, WeeklyReportOutput } from '../types/weekly-report.types';

export class WeeklyReportAgentService implements IAgent<WeeklyReportInput, WeeklyReportOutput> {
  readonly type = 'weekly-report' as const;

  async generate(
    input: WeeklyReportInput,
    context: {
      meetingSummaries: string;
      taskStats: Record<string, number>;
      openRisks: string;
      meetingCount: number;
    },
  ): Promise<{
    output: WeeklyReportOutput;
    model: string;
    promptTokens: number;
    completionTokens: number;
  }> {
    const retrieval = await ragService.search({
      query: `workspace activity between ${input.dateFrom} and ${input.dateTo}`,
      workspaceId: input.workspaceId,
      mode: 'hybrid',
      topK: 8,
    });

    const contextBlocks = retrieval.chunks
      .map(
        (chunk, index) =>
          `[${index + 1}] ${chunk.metadata.meetingTitle ?? 'Meeting'}: ${chunk.content.slice(0, 300)}`,
      )
      .join('\n');

    const rendered = promptRegistry.render('weekly-report', {
      variables: {
        workspaceId: input.workspaceId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        retrievedContext: contextBlocks,
      },
    });

    const systemContent =
      rendered?.messages[0]?.content ??
      'You generate weekly workspace intelligence reports. Return valid JSON only.';

    const userContent = [
      `Period: ${input.dateFrom} to ${input.dateTo}`,
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
      contextBlocks || 'No additional context retrieved.',
    ].join('\n');

    const response = await llmService.complete(
      {
        workflow: 'weekly-report',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        responseFormat: 'json_schema',
        jsonSchema: WEEKLY_REPORT_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
        workspaceId: input.workspaceId,
        correlationId: input.correlationId,
      },
      {
        promptId: 'weekly-report',
        promptVersion: rendered?.version ?? '1.0.0',
      },
    );

    const output = JSON.parse(response.content) as WeeklyReportOutput;
    return {
      output,
      model: response.model,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
    };
  }

  async execute(
    message: AgentMessage<WeeklyReportInput, WeeklyReportOutput>,
  ): Promise<AgentMessage<WeeklyReportInput, WeeklyReportOutput>> {
    const startedAt = Date.now();
    const generated = await this.generate(message.input, {
      meetingSummaries: '',
      taskStats: {},
      openRisks: '',
      meetingCount: 0,
    });

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
      },
    };
  }
}

export const weeklyReportAgent = new WeeklyReportAgentService();

export function buildWeeklyReportMessage(input: WeeklyReportInput) {
  return {
    id: randomUUID(),
    correlationId: input.correlationId ?? randomUUID(),
    agentType: 'weekly-report' as const,
    workspaceId: input.workspaceId,
    input,
    status: 'pending' as const,
    metrics: { startedAt: new Date().toISOString() },
  };
}
