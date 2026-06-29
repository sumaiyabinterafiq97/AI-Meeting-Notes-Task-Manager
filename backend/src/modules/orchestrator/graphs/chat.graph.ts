import { graphExecutorService } from '../executors/graph-executor.service';
import { getWorkflowDefinition } from '../workflows/workflow.types';
import { chatPipelineNodes } from '../nodes';
import { createInitialState } from '../state/reducers';
import type { ChatPipelineState } from '../state/graph-state.types';
import type { ChatAgentInput } from '../../agents/chat/types/chat-agent.types';
import { sanitizeWorkflowInput } from '../middleware/security.middleware';

export async function runChatGraph(
  input: ChatAgentInput & {
    correlationId: string;
    workspaceId: string;
    sessionId: string;
    query: string;
  },
  options?: { threadId?: string },
): Promise<ChatPipelineState> {
  const definition = getWorkflowDefinition('chat');
  let initialState: ChatPipelineState = {
    ...createInitialState({
      workflowId: 'chat',
      correlationId: input.correlationId,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      meetingId: input.meetingId,
      input: { ...input, userMessage: input.userMessage, query: input.query },
    }),
    workflowId: 'chat',
    sessionId: input.sessionId,
  };

  initialState = sanitizeWorkflowInput(initialState) as ChatPipelineState;

  return graphExecutorService.invoke(definition, chatPipelineNodes, initialState, {
    threadId: options?.threadId ?? input.correlationId,
  }) as Promise<ChatPipelineState>;
}
