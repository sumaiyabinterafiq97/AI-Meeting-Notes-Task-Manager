import { randomUUID } from 'crypto';
import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { inputSanitizerService } from '../../security/input-sanitizer.service';
import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import { agentExecutionService } from '../../services/agent-execution.service';
import { prepareAgentTranscript } from '../../shared/transcript.utils';
import { runWithTruncatedRetry } from '../../shared/agent-transcript-run';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { DecisionInput, DecisionOutput } from '../types/decision.types';
import {
  buildEmptyTranscriptDecisionOutput,
  enrichDecisionOutput,
} from './decision.validator';
import { FALLBACK_DECISION_OUTPUT } from './decision.constants';

export class DecisionAgentService implements IAgent<DecisionInput, DecisionOutput> {
  readonly type = 'decision' as const;

  private sanitizeInput(input: DecisionInput): DecisionInput {
    return {
      ...input,
      transcript: inputSanitizerService.sanitizeTranscript(input.transcript),
      summary: input.summary
        ? inputSanitizerService.sanitizeText(input.summary, { field: 'promptVar' })
        : input.summary,
      memberNames: input.memberNames.map((name) =>
        inputSanitizerService.sanitizeText(name, { field: 'promptVar', maxLength: 120 }),
      ),
    };
  }

  private buildUserContent(input: DecisionInput, options?: { truncated?: boolean }): string {
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    const sections = [
      `Attendees: ${memberList}`,
      input.meetingDate ? `Meeting date: ${input.meetingDate}` : '',
      input.summary ? `Meeting summary (disambiguation only):\n${input.summary}` : '',
    ];

    if (options?.truncated) {
      sections.push('Note: Transcript was truncated due to length limits.');
    }

    sections.push('', 'Transcript:', input.transcript);
    return sections.filter(Boolean).join('\n');
  }

  private async runStructured(
    message: AgentMessage<DecisionInput, DecisionOutput>,
    input: DecisionInput,
    options?: { truncated?: boolean },
  ): Promise<AgentMessage<DecisionInput, DecisionOutput>> {
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'decision-agent',
      workflow: 'decision',
      message: { ...message, input },
      variables: {
        transcript: input.transcript,
        summary: input.summary ?? '',
        memberNames: memberList,
      },
      userContent: this.buildUserContent(input, options),
      fallbackOutput: FALLBACK_DECISION_OUTPUT,
      normalizeOutput: (output) => enrichDecisionOutput(output, input),
    });
  }

  private async runEmptyTranscript(
    message: AgentMessage<DecisionInput, DecisionOutput>,
    startedAt: number,
  ): Promise<AgentMessage<DecisionInput, DecisionOutput>> {
    const execution = await agentExecutionService.start({
      jobId: message.jobId,
      workspaceId: message.workspaceId,
      meetingId: message.meetingId,
      correlationId: message.correlationId,
      agentType: this.type,
    });

    const output = buildEmptyTranscriptDecisionOutput();
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
    message: AgentMessage<DecisionInput, DecisionOutput>,
  ): Promise<AgentMessage<DecisionInput, DecisionOutput>> {
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

export const decisionAgent = new DecisionAgentService();

export function buildDecisionMessage(
  input: DecisionInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string; jobId?: string },
) {
  return createAgentMessage('decision', workspaceId, input, options);
}

export function buildDecisionCorrelationId(): string {
  return randomUUID();
}
