import { randomUUID } from 'crypto';
import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { inputSanitizerService } from '../../security/input-sanitizer.service';
import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import { agentExecutionService } from '../../services/agent-execution.service';
import { prepareAgentTranscript } from '../../shared/transcript.utils';
import { runWithTruncatedRetry } from '../../shared/agent-transcript-run';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { RiskAnalyzerInput, RiskAnalyzerOutput } from '../types/risk-analyzer.types';
import {
  buildEmptyTranscriptRiskOutput,
  enrichRiskAnalyzerOutput,
} from './risk-analyzer.validator';
import { FALLBACK_RISK_ANALYZER_OUTPUT } from './risk-analyzer.constants';

export class RiskAnalyzerAgentService implements IAgent<RiskAnalyzerInput, RiskAnalyzerOutput> {
  readonly type = 'risk-analyzer' as const;

  private sanitizeInput(input: RiskAnalyzerInput): RiskAnalyzerInput {
    return {
      ...input,
      transcript: inputSanitizerService.sanitizeTranscript(input.transcript),
      summary: input.summary
        ? inputSanitizerService.sanitizeText(input.summary, { field: 'promptVar' })
        : input.summary,
      tags: input.tags?.map((tag) =>
        inputSanitizerService.sanitizeText(tag, { field: 'promptVar', maxLength: 80 }),
      ),
    };
  }

  private buildDecisionsText(input: RiskAnalyzerInput): string {
    if (!input.decisions?.length) {
      return '';
    }

    return input.decisions.map((decision) => `- ${decision.text} (${decision.context})`).join('\n');
  }

  private buildUserContent(input: RiskAnalyzerInput, options?: { truncated?: boolean }): string {
    const decisionsText = this.buildDecisionsText(input);
    const tagsText = input.tags?.length ? input.tags.join(', ') : '';

    const sections = [
      input.meetingDate ? `Meeting date: ${input.meetingDate}` : '',
      tagsText ? `Tags: ${tagsText}` : '',
      input.summary ? `Meeting summary (context only):\n${input.summary}` : '',
      decisionsText ? `Decisions (context only):\n${decisionsText}` : '',
    ];

    if (options?.truncated) {
      sections.push('Note: Transcript was truncated due to length limits.');
    }

    sections.push('', 'Transcript:', input.transcript);
    return sections.filter(Boolean).join('\n');
  }

  private async runStructured(
    message: AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>,
    input: RiskAnalyzerInput,
    options?: { truncated?: boolean },
  ): Promise<AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>> {
    const decisionsText = this.buildDecisionsText(input);

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'risk-analyzer',
      workflow: 'risk-analyzer',
      message: { ...message, input },
      variables: {
        transcript: input.transcript,
        summary: input.summary ?? '',
        decisions: decisionsText,
        tags: input.tags?.join(', ') ?? '',
      },
      userContent: this.buildUserContent(input, options),
      fallbackOutput: FALLBACK_RISK_ANALYZER_OUTPUT,
      normalizeOutput: (output) => enrichRiskAnalyzerOutput(output, input),
    });
  }

  private async runEmptyTranscript(
    message: AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>,
    startedAt: number,
  ): Promise<AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>> {
    const execution = await agentExecutionService.start({
      jobId: message.jobId,
      workspaceId: message.workspaceId,
      meetingId: message.meetingId,
      correlationId: message.correlationId,
      agentType: this.type,
    });

    const output = buildEmptyTranscriptRiskOutput();
    const latencyMs = Date.now() - startedAt;

    await agentExecutionService.complete(execution.id, {
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      model: 'none',
      provider: 'none',
    });

    return {
      ...message,
      status: 'completed',
      output,
      metrics: {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
        model: 'none',
        provider: 'none',
      },
    };
  }

  async execute(
    message: AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>,
  ): Promise<AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>> {
    const startedAt = Date.now();
    const sanitized = this.sanitizeInput(message.input);
    const prepared = prepareAgentTranscript(sanitized);

    if (isTranscriptEmpty(prepared.transcript)) {
      return this.runEmptyTranscript({ ...message, input: prepared }, startedAt);
    }

    return runWithTruncatedRetry(sanitized, prepared, message, (msg, input, opts) =>
      this.runStructured(msg, input, opts),
    );
  }
}

export const riskAnalyzerAgent = new RiskAnalyzerAgentService();

export function buildRiskAnalyzerMessage(
  input: RiskAnalyzerInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string; jobId?: string },
) {
  return createAgentMessage('risk-analyzer', workspaceId, input, options);
}

export function buildRiskAnalyzerCorrelationId(): string {
  return randomUUID();
}
