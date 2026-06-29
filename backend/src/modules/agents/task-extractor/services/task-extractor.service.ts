import { randomUUID } from 'crypto';
import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { inputSanitizerService } from '../../security/input-sanitizer.service';
import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import { agentExecutionService } from '../../services/agent-execution.service';
import { prepareAgentTranscript } from '../../shared/transcript.utils';
import { runWithTruncatedRetry } from '../../shared/agent-transcript-run';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { TaskExtractorInput, TaskExtractorOutput } from '../types/task-extractor.types';
import {
  buildEmptyTranscriptTaskOutput,
  enrichTaskExtractorOutput,
} from './task-extractor.validator';
import { FALLBACK_TASK_EXTRACTOR_OUTPUT } from './task-extractor.constants';

export class TaskExtractorAgentService implements IAgent<TaskExtractorInput, TaskExtractorOutput> {
  readonly type = 'task-extractor' as const;

  private sanitizeInput(input: TaskExtractorInput): TaskExtractorInput {
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

  private buildUserContent(input: TaskExtractorInput, options?: { truncated?: boolean }): string {
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    const sections = [
      `Workspace members: ${memberList}`,
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
    message: AgentMessage<TaskExtractorInput, TaskExtractorOutput>,
    input: TaskExtractorInput,
    options?: { truncated?: boolean },
  ): Promise<AgentMessage<TaskExtractorInput, TaskExtractorOutput>> {
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'task-extractor',
      workflow: 'task-extractor',
      message: { ...message, input },
      variables: {
        transcript: input.transcript,
        memberNames: memberList,
        summary: input.summary ?? '',
      },
      userContent: this.buildUserContent(input, options),
      fallbackOutput: FALLBACK_TASK_EXTRACTOR_OUTPUT,
      normalizeOutput: (output) => enrichTaskExtractorOutput(output, input),
    });
  }

  private async runEmptyTranscript(
    message: AgentMessage<TaskExtractorInput, TaskExtractorOutput>,
    startedAt: number,
  ): Promise<AgentMessage<TaskExtractorInput, TaskExtractorOutput>> {
    const execution = await agentExecutionService.start({
      jobId: message.jobId,
      workspaceId: message.workspaceId,
      meetingId: message.meetingId,
      correlationId: message.correlationId,
      agentType: this.type,
    });

    const output = buildEmptyTranscriptTaskOutput();
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
    message: AgentMessage<TaskExtractorInput, TaskExtractorOutput>,
  ): Promise<AgentMessage<TaskExtractorInput, TaskExtractorOutput>> {
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

export const taskExtractorAgent = new TaskExtractorAgentService();

export function buildTaskExtractorMessage(
  input: TaskExtractorInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string; jobId?: string },
) {
  return createAgentMessage('task-extractor', workspaceId, input, options);
}

export function buildTaskExtractorCorrelationId(): string {
  return randomUUID();
}
