import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { TASK_EXTRACTOR_OUTPUT_SCHEMA } from '../../schemas/agent-schemas';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { TaskExtractorInput, TaskExtractorOutput } from '../types/task-extractor.types';

const FALLBACK_OUTPUT: TaskExtractorOutput = { actionItems: [] };

export class TaskExtractorAgentService implements IAgent<TaskExtractorInput, TaskExtractorOutput> {
  readonly type = 'task-extractor' as const;

  async execute(
    message: AgentMessage<TaskExtractorInput, TaskExtractorOutput>,
  ): Promise<AgentMessage<TaskExtractorInput, TaskExtractorOutput>> {
    const { input } = message;
    const memberList = input.memberNames.length > 0 ? input.memberNames.join(', ') : 'Unknown';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'task-extractor',
      workflow: 'task-extractor',
      jsonSchema: TASK_EXTRACTOR_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      message,
      variables: {
        transcript: input.transcript,
        memberNames: memberList,
        summary: input.summary ?? '',
      },
      userContent: [
        `Workspace members: ${memberList}`,
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

export const taskExtractorAgent = new TaskExtractorAgentService();

export function buildTaskExtractorMessage(
  input: TaskExtractorInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string },
) {
  return createAgentMessage('task-extractor', workspaceId, input, options);
}
