import { randomUUID } from 'crypto';
import {
  createAgentMessage,
  runStructuredAgent,
} from '../../services/agent-runner.service';
import { inputSanitizerService } from '../../security/input-sanitizer.service';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { SummarizerInput, SummarizerOutput } from '../types/summarizer.types';
import { agentExecutionService } from '../../services/agent-execution.service';
import {
  buildEmptyTranscriptOutput,
  enrichSummarizerOutput,
  isTranscriptEmpty,
} from './summarizer.validator';
import { FALLBACK_SUMMARIZER_OUTPUT } from './summarizer.constants';
import {
  prepareAgentTranscript,
  truncateTranscriptForAgent,
} from '../../shared/transcript.utils';
import { runWithTruncatedRetry } from '../../shared/agent-transcript-run';

/** @deprecated Use truncateTranscriptForAgent from shared transcript utils. */
export const truncateTranscriptForSummarizer = truncateTranscriptForAgent;

export class SummarizerAgentService implements IAgent<SummarizerInput, SummarizerOutput> {
  readonly type = 'summarizer' as const;

  private buildUserContent(input: SummarizerInput, options?: { truncated?: boolean }): string {
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    const sections = [
      `Meeting title: ${input.meetingTitle}`,
      `Meeting date: ${input.meetingDate}`,
      input.durationMinutes ? `Duration: ${input.durationMinutes} minutes` : '',
      `Attendees: ${memberList}`,
    ];

    if (input.agenda?.trim()) {
      sections.push('', `Agenda:\n${input.agenda.trim()}`);
    }

    if (input.tags && input.tags.length > 0) {
      sections.push('', `Tags: ${input.tags.join(', ')}`);
    }

    if (options?.truncated) {
      sections.push('', 'Note: Transcript was truncated due to length limits.');
    }

    sections.push('', 'Transcript:', input.transcript);
    return sections.filter(Boolean).join('\n');
  }

  private sanitizeInput(input: SummarizerInput): SummarizerInput {
    return {
      ...input,
      transcript: inputSanitizerService.sanitizeTranscript(input.transcript),
      meetingTitle: inputSanitizerService.sanitizeText(input.meetingTitle, {
        field: 'promptVar',
        maxLength: 300,
      }),
      memberNames: input.memberNames.map((name) =>
        inputSanitizerService.sanitizeText(name, { field: 'promptVar', maxLength: 120 }),
      ),
      agenda: input.agenda
        ? inputSanitizerService.sanitizeText(input.agenda, { field: 'promptVar' })
        : input.agenda,
    };
  }

  private async runStructured(
    message: AgentMessage<SummarizerInput, SummarizerOutput>,
    input: SummarizerInput,
    options?: { truncated?: boolean },
  ): Promise<AgentMessage<SummarizerInput, SummarizerOutput>> {
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'summarizer',
      workflow: 'summarizer',
      message: { ...message, input },
      variables: {
        transcript: input.transcript,
        meetingTitle: input.meetingTitle,
        memberNames: memberList,
        meetingDate: input.meetingDate,
      },
      userContent: this.buildUserContent(input, options),
      fallbackOutput: FALLBACK_SUMMARIZER_OUTPUT,
      normalizeOutput: (output) => enrichSummarizerOutput(output, input),
    });
  }

  private async runEmptyTranscript(
    message: AgentMessage<SummarizerInput, SummarizerOutput>,
    startedAt: number,
  ): Promise<AgentMessage<SummarizerInput, SummarizerOutput>> {
    const execution = await agentExecutionService.start({
      jobId: message.jobId,
      workspaceId: message.workspaceId,
      meetingId: message.meetingId,
      correlationId: message.correlationId,
      agentType: this.type,
    });

    const output = buildEmptyTranscriptOutput();
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
    message: AgentMessage<SummarizerInput, SummarizerOutput>,
  ): Promise<AgentMessage<SummarizerInput, SummarizerOutput>> {
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

export const summarizerAgent = new SummarizerAgentService();

export function buildSummarizerMessage(
  input: SummarizerInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string; jobId?: string },
) {
  return createAgentMessage('summarizer', workspaceId, input, options);
}

export function buildSummarizerCorrelationId(): string {
  return randomUUID();
}
