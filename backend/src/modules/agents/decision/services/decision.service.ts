import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { DECISION_OUTPUT_SCHEMA } from '../../schemas/agent-schemas';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { DecisionInput, DecisionOutput } from '../types/decision.types';

const FALLBACK_OUTPUT: DecisionOutput = { decisions: [] };

export class DecisionAgentService implements IAgent<DecisionInput, DecisionOutput> {
  readonly type = 'decision' as const;

  async execute(
    message: AgentMessage<DecisionInput, DecisionOutput>,
  ): Promise<AgentMessage<DecisionInput, DecisionOutput>> {
    const { input } = message;
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'decision-agent',
      workflow: 'decision',
      jsonSchema: DECISION_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      message,
      variables: {
        transcript: input.transcript,
        summary: input.summary ?? '',
        memberNames: memberList,
      },
      userContent: [
        `Attendees: ${memberList}`,
        input.summary ? `Meeting summary:\n${input.summary}` : '',
        '',
        'Transcript:',
        input.transcript,
      ]
        .filter(Boolean)
        .join('\n'),
      fallbackOutput: FALLBACK_OUTPUT,
    });
  }
}

export const decisionAgent = new DecisionAgentService();

export function buildDecisionMessage(
  input: DecisionInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string },
) {
  return createAgentMessage('decision', workspaceId, input, options);
}
