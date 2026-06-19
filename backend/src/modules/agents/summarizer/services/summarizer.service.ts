import {
  createAgentMessage,
  runStructuredAgent,
} from '../../services/agent-runner.service';
import {
  SUMMARIZER_OUTPUT_SCHEMA,
} from '../../schemas/agent-schemas';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { SummarizerInput, SummarizerOutput } from '../types/summarizer.types';

const FALLBACK_OUTPUT: SummarizerOutput = {
  summary: 'Summary generation failed. Other meeting insights may still be available.',
  keyTopics: [],
};

export class SummarizerAgentService implements IAgent<SummarizerInput, SummarizerOutput> {
  readonly type = 'summarizer' as const;

  async execute(
    message: AgentMessage<SummarizerInput, SummarizerOutput>,
  ): Promise<AgentMessage<SummarizerInput, SummarizerOutput>> {
    const { input } = message;
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'summarizer',
      workflow: 'summarizer',
      jsonSchema: SUMMARIZER_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      message,
      variables: {
        transcript: input.transcript,
        meetingTitle: input.meetingTitle,
        memberNames: memberList,
        meetingDate: input.meetingDate,
      },
      userContent: [
        `Meeting title: ${input.meetingTitle}`,
        `Meeting date: ${input.meetingDate}`,
        `Attendees: ${memberList}`,
        '',
        'Transcript:',
        input.transcript,
      ].join('\n'),
      fallbackOutput: FALLBACK_OUTPUT,
    });
  }
}

export const summarizerAgent = new SummarizerAgentService();

export function buildSummarizerMessage(
  input: SummarizerInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string },
) {
  return createAgentMessage('summarizer', workspaceId, input, options);
}
