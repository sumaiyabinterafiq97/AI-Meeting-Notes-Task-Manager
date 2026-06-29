import { buildMeetingChunkInputs } from '../../chunking/builders/meeting-chunk.builder';
import { chunkingService } from '../../chunking/services/chunking.service';
import { entityEmbeddingService } from '../../embeddings/services/entity-embedding.service';
import { vectorRepository } from '../../vector/repositories/vector.repository';
import { ragCacheService } from '../../rag/services/rag-cache.service';
import { executeNode } from '../executors/node-executor';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import { knowledgeNode } from './knowledge.node';

export const chunkingNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'chunking',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const meetingId = String(state.input.meetingId ?? state.meetingId ?? '');
      const inputs = await buildMeetingChunkInputs(meetingId);
      const chunks = chunkingService.chunk(inputs);
      return { input: { ...state.input, chunks, meetingId } };
    },
  });
};

export const embeddingNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'embedding',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const meetingId = String(state.input.meetingId ?? state.meetingId ?? '');
      const chunks = (state.input.chunks ?? []) as Parameters<
        typeof entityEmbeddingService.buildStoredChunks
      >[0]['chunks'];

      const existingEmbeddings = await vectorRepository.findMeetingChunkEmbeddings(meetingId);
      const { stored, skipped } = await entityEmbeddingService.buildStoredChunks({
        workspaceId: state.workspaceId,
        meetingId,
        chunks,
        existingEmbeddings,
        jobId: state.jobId,
      });

      return { input: { ...state.input, storedChunks: stored, chunksSkipped: skipped } };
    },
  });
};

export const vectorStorageNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'vector_storage',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const meetingId = String(state.input.meetingId ?? state.meetingId ?? '');
      const stored = (state.input.storedChunks ?? []) as Parameters<
        typeof vectorRepository.replaceMeetingChunks
      >[2];

      await vectorRepository.replaceMeetingChunks(meetingId, state.workspaceId, stored);
      return { input: { ...state.input, indexed: true, chunksStored: stored.length } };
    },
  });
};

export const indexUpdateNode: GraphNodeFn = async (state) => {
  await ragCacheService.invalidateWorkspace(state.workspaceId);
  return { status: 'completed' };
};

export const knowledgeUpdateKnowledgeNode: GraphNodeFn = knowledgeNode as GraphNodeFn;
