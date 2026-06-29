import { ragCacheService } from '../../rag/services/rag-cache.service';
import { buildMeetingChunkInputs } from '../../chunking/builders/meeting-chunk.builder';
import { chunkingService } from '../../chunking/services/chunking.service';
import { vectorRepository } from '../../vector/repositories/vector.repository';
import type { EmbedMeetingResultDto } from '../dto/embedding.dto';
import { embeddingRepository } from '../repositories/embedding.repository';
import { entityEmbeddingService } from './entity-embedding.service';

export class MeetingEmbeddingService {
  async embedMeeting(meetingId: string, workspaceId: string): Promise<EmbedMeetingResultDto> {
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
        chunksSkipped: 0,
      };
    }

    const job = await embeddingRepository.createJob(workspaceId, meetingId, textChunks.length);
    await embeddingRepository.markRunning(job.id);

    try {
      const existingEmbeddings = await vectorRepository.findMeetingChunkEmbeddings(meetingId);
      const { stored, skipped } = await entityEmbeddingService.buildStoredChunks({
        workspaceId,
        meetingId,
        chunks: textChunks,
        existingEmbeddings,
        jobId: job.id,
      });

      await vectorRepository.replaceMeetingChunks(meetingId, workspaceId, stored);
      await embeddingRepository.markCompleted(job.id, stored.length);
      await ragCacheService.invalidateWorkspace(workspaceId);

      return {
        jobId: job.id,
        meetingId,
        workspaceId,
        chunksStored: stored.length,
        chunksSkipped: skipped,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Embedding failed';
      await embeddingRepository.markFailed(job.id, message);
      throw error;
    }
  }

  async refreshMeeting(meetingId: string, workspaceId: string): Promise<EmbedMeetingResultDto> {
    await vectorRepository.deleteByMeeting(meetingId);
    return this.embedMeeting(meetingId, workspaceId);
  }
}

export const meetingEmbeddingService = new MeetingEmbeddingService();
