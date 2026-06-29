import { executeNode } from '../executors/node-executor';
import { chatAgent, buildChatMessage } from '../../agents/chat/services/chat-agent.service';
import type { ChatAgentInput } from '../../agents/chat/types/chat-agent.types';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import { orchestratorEventBus } from '../events/event-bus.service';

export const chatNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'chat',
    agentType: 'chat',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const chatInput = state.input as ChatAgentInput & Record<string, unknown>;
      const message = buildChatMessage(chatInput, { correlationId: state.correlationId });
      const result = await chatAgent.execute(message);

      await orchestratorEventBus.emit(
        orchestratorEventBus.createEvent('ChatCompleted', {
          workflowId: 'chat',
          correlationId: state.correlationId,
          workspaceId: state.workspaceId,
          sessionId: state.sessionId,
          payload: {
            citationCount: (result.output as { citations?: unknown[] } | undefined)?.citations?.length ?? 0,
          },
        }),
      );

      return {
        agentResults: { chat: result },
        status: 'completed',
        metrics: {
          completedAt: new Date().toISOString(),
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};
