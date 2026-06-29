import { executeNode } from '../executors/node-executor';
import { ragService } from '../../rag';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';

export const retrieverNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'retriever',
    agentType: 'retriever',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const query = String(state.input.query ?? state.input.userMessage ?? '');
      const topK = Number(state.input.topK ?? 10);
      const meetingId = state.input.meetingId as string | undefined;

      const result = await ragService.retrieve({
        query,
        workspaceId: state.workspaceId,
        meetingId,
        topK,
        mode: 'hybrid',
      });

      return {
        agentResults: {
          retriever: {
            id: `retriever-${state.correlationId}`,
            correlationId: state.correlationId,
            agentType: 'retriever',
            workspaceId: state.workspaceId,
            meetingId: state.meetingId,
            input: { query },
            output: result,
            status: 'completed',
            metrics: { startedAt: new Date().toISOString(), latencyMs: result.latencyMs },
          },
        },
        input: { ...state.input, retrievedChunks: result.chunks },
      };
    },
  });
};
