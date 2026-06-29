import { executeNode } from '../executors/node-executor';
import { contextBuilderService } from '../../rag/context-builders/context-builder.service';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';

export const contextBuilderNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'context_builder',
    agentType: 'context-builder',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const chunks = (state.input.retrievedChunks ?? []) as RetrievedChunk[];
      const tokenBudget = Number(state.input.tokenBudget ?? 24_000);

      const context = contextBuilderService.buildForChat(chunks, tokenBudget);

      return {
        agentResults: {
          'context-builder': {
            id: `context-${state.correlationId}`,
            correlationId: state.correlationId,
            agentType: 'context-builder',
            workspaceId: state.workspaceId,
            input: { chunkCount: chunks.length },
            output: context,
            status: 'completed',
            metrics: { startedAt: new Date().toISOString() },
          },
        },
        input: { ...state.input, contextBlocks: context.blocks, citations: context.citations },
      };
    },
  });
};
