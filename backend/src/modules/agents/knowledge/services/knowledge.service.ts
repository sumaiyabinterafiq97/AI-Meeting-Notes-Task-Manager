import { randomUUID } from 'crypto';
import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { inputSanitizerService } from '../../security/input-sanitizer.service';
import { isTranscriptEmpty } from '../../summarizer/services/summarizer.validator';
import { agentExecutionService } from '../../services/agent-execution.service';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { KnowledgeInput, KnowledgeOutput } from '../types/knowledge.types';
import {
  buildEmptyTranscriptKnowledgeOutput,
  enrichKnowledgeOutput,
} from './knowledge.validator';
import {
  FALLBACK_KNOWLEDGE_OUTPUT,
  KNOWLEDGE_TRANSCRIPT_EXCERPT_LENGTH,
} from './knowledge.constants';

export class KnowledgeAgentService implements IAgent<KnowledgeInput, KnowledgeOutput> {
  readonly type = 'knowledge' as const;

  private sanitizeInput(input: KnowledgeInput): KnowledgeInput {
    return {
      ...input,
      transcript: inputSanitizerService.sanitizeTranscript(input.transcript),
      summary: inputSanitizerService.sanitizeText(input.summary, { field: 'promptVar' }),
      meetingTitle: input.meetingTitle
        ? inputSanitizerService.sanitizeText(input.meetingTitle, { field: 'promptVar', maxLength: 200 })
        : input.meetingTitle,
      decisions: input.decisions.map((decision) => ({
        text: inputSanitizerService.sanitizeText(decision.text, { field: 'promptVar', maxLength: 500 }),
        context: inputSanitizerService.sanitizeText(decision.context, { field: 'promptVar', maxLength: 1000 }),
      })),
    };
  }

  private buildMergedOutput(input: KnowledgeInput): string {
    return JSON.stringify({
      summary: input.summary,
      decisions: input.decisions,
    });
  }

  private buildUserContent(input: KnowledgeInput): string {
    const decisionsText = input.decisions
      .map((decision) => `- ${decision.text}: ${decision.context}`)
      .join('\n');

    return [
      input.meetingTitle ? `Meeting: ${input.meetingTitle}` : '',
      `Summary:\n${input.summary}`,
      decisionsText ? `Decisions:\n${decisionsText}` : '',
      '',
      'Transcript excerpt:',
      input.transcript.slice(0, KNOWLEDGE_TRANSCRIPT_EXCERPT_LENGTH),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async runEmptyTranscript(
    message: AgentMessage<KnowledgeInput, KnowledgeOutput>,
    startedAt: number,
  ): Promise<AgentMessage<KnowledgeInput, KnowledgeOutput>> {
    const execution = await agentExecutionService.start({
      jobId: message.jobId,
      workspaceId: message.workspaceId,
      meetingId: message.meetingId,
      correlationId: message.correlationId,
      agentType: this.type,
    });

    const output = buildEmptyTranscriptKnowledgeOutput();
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
    message: AgentMessage<KnowledgeInput, KnowledgeOutput>,
  ): Promise<AgentMessage<KnowledgeInput, KnowledgeOutput>> {
    const startedAt = Date.now();
    const input = this.sanitizeInput(message.input);

    if (isTranscriptEmpty(input.transcript)) {
      return this.runEmptyTranscript({ ...message, input }, startedAt);
    }

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'knowledge-agent',
      workflow: 'knowledge-extract',
      message: { ...message, input },
      variables: {
        workspaceId: input.workspaceId,
        meetingId: input.meetingId,
        meetingTitle: input.meetingTitle ?? 'Meeting',
        transcript: input.transcript,
        mergedOutput: this.buildMergedOutput(input),
      },
      userContent: this.buildUserContent(input),
      fallbackOutput: FALLBACK_KNOWLEDGE_OUTPUT,
      normalizeOutput: (output) => enrichKnowledgeOutput(output, input),
      jobId: input.jobId,
    });
  }
}

export const knowledgeAgent = new KnowledgeAgentService();

export function buildKnowledgeMessage(
  input: KnowledgeInput,
  options?: { correlationId?: string },
) {
  return createAgentMessage('knowledge', input.workspaceId, input, {
    meetingId: input.meetingId,
    correlationId: options?.correlationId ?? randomUUID(),
    jobId: input.jobId,
  });
}

export function buildKnowledgeCorrelationId(): string {
  return randomUUID();
}
