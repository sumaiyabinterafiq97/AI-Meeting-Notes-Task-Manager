import { ragCacheService } from '../../rag/services/rag-cache.service';
import { buildMeetingChunkInputs } from '../../chunking/builders/meeting-chunk.builder';
import { chunkingService } from '../../chunking/services/chunking.service';
import type { TextChunk } from '../../chunking/types/chunk.types';
import { vectorRepository } from '../../vector/repositories/vector.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { embeddingService } from './embedding.service';

export interface EmbedMeetingResult {
  jobId: string;
  meetingId: string;
  workspaceId: string;
  chunksStored: number;
}

export class MeetingEmbeddingService {
  async embedMeeting(meetingId: string, workspaceId: string): Promise<EmbedMeetingResult> {
    const inputs = await buildMeetingChunkInputs(meetingId);
    const textChunks = chunkingService.chunk(inputs);

    if (textChunks.length === 0) {
      const job = await embeddingRepository.createJob(workspaceId, meetingId, 0);
      await embeddingRepository.markCompleted(job.id, 0);
      return {
        jobId: job.id,
        meetingId,
        workspaceId,
        chunksStored: 0,
      };
    }

    const job = await embeddingRepository.createJob(workspaceId, meetingId, textChunks.length);
    await embeddingRepository.markRunning(job.id);

    try {
      const stored = await this.embedAndStoreChunks(meetingId, workspaceId, textChunks, job.id);
      await embeddingRepository.markCompleted(job.id, stored);
      await ragCacheService.invalidateWorkspace(workspaceId);
      return {
        jobId: job.id,
        meetingId,
        workspaceId,
        chunksStored: stored,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Embedding failed';
      await embeddingRepository.markFailed(job.id, message);
      throw error;
    }
  }

  async refreshMeeting(meetingId: string, workspaceId: string): Promise<EmbedMeetingResult> {
    await vectorRepository.deleteByMeeting(meetingId);
    return this.embedMeeting(meetingId, workspaceId);
  }

  private async embedAndStoreChunks(
    meetingId: string,
    workspaceId: string,
    textChunks: TextChunk[],
    jobId: string,
  ): Promise<number> {
    const texts = textChunks.map((chunk) => chunk.content);
    const { embeddings, model } = await embeddingService.generateBatch(texts, workspaceId);

    const storedChunks = textChunks.map((chunk, index) => ({
      workspaceId,
      meetingId,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[index] ?? [],
      embeddingModel: model,
      metadata: chunk.metadata,
    }));

    await vectorRepository.replaceMeetingChunks(meetingId, workspaceId, storedChunks);
    await embeddingRepository.updateProgress(jobId, storedChunks.length);

    return storedChunks.length;
  }
}

export const meetingEmbeddingService = new MeetingEmbeddingService();
