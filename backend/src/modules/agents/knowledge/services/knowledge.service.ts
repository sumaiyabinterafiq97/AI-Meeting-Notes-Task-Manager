import { randomUUID } from 'crypto';
import {
  createAgentMessage,
  runStructuredAgent,
} from '../../services/agent-runner.service';
import { KNOWLEDGE_OUTPUT_SCHEMA } from '../../schemas/agent-schemas';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { KnowledgeInput, KnowledgeOutput } from '../types/knowledge.types';

const FALLBACK_OUTPUT: KnowledgeOutput = { entries: [] };

export class KnowledgeAgentService implements IAgent<KnowledgeInput, KnowledgeOutput> {
  readonly type = 'knowledge' as const;

  async execute(
    message: AgentMessage<KnowledgeInput, KnowledgeOutput>,
  ): Promise<AgentMessage<KnowledgeInput, KnowledgeOutput>> {
    const { input } = message;
    const decisionsText = input.decisions
      .map((decision) => `- ${decision.text}: ${decision.context}`)
      .join('\n');

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'knowledge-agent',
      workflow: 'knowledge-extract',
      jsonSchema: KNOWLEDGE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      message,
      variables: {
        workspaceId: input.workspaceId,
        transcript: input.transcript,
        mergedOutput: JSON.stringify({
          summary: input.summary,
          decisions: input.decisions,
        }),
      },
      userContent: [
        `Summary:\n${input.summary}`,
        decisionsText ? `Decisions:\n${decisionsText}` : '',
        '',
        'Transcript excerpt:',
        input.transcript.slice(0, 12_000),
      ]
        .filter(Boolean)
        .join('\n'),
      fallbackOutput: FALLBACK_OUTPUT,
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
