import { chunkingService } from '../../chunking/services/chunking.service';
import type { TextChunk } from '../../chunking/types/chunk.types';
import { ragCacheService } from '../../rag/services/rag-cache.service';
import { vectorRepository, type StoredChunkInput } from '../../vector/repositories/vector.repository';
import { normalizeChunkSourceType } from '../../vector/utils/source-type';
import {
  chunkStorageKey,
  EMBEDDING_BATCH_SIZE,
} from '../lib/embedding.constants';
import { chunkMetadataService } from './chunk-metadata.service';
import { embeddingRepository } from '../repositories/embedding.repository';
import { embeddingService } from './embedding.service';
import type { EmbedEntityInput, StoredChunkEmbedding } from '../types/embedding.types';

export class EntityEmbeddingService {
  async embedEntity(input: EmbedEntityInput): Promise<number> {
    const chunks = chunkingService.chunk([
      {
        content: input.content,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        meetingId: input.meetingId,
        metadata: input.metadata,
      },
    ]);

    if (chunks.length === 0) {
      return 0;
    }

    const stored = await this.buildStoredChunks({
      workspaceId: input.workspaceId,
      meetingId: input.meetingId,
      chunks,
    });

    await vectorRepository.replaceSourceChunks({
      workspaceId: input.workspaceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunks: stored.stored,
    });

    await ragCacheService.invalidateWorkspace(input.workspaceId);
    return stored.stored.length;
  }

  async buildStoredChunks(params: {
    workspaceId: string;
    meetingId?: string;
    chunks: TextChunk[];
    existingEmbeddings?: Map<string, StoredChunkEmbedding>;
    jobId?: string;
  }): Promise<{ stored: StoredChunkInput[]; skipped: number }> {
    const { workspaceId, meetingId, chunks, existingEmbeddings, jobId } = params;
    const stored: StoredChunkInput[] = [];
    let skipped = 0;

    for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const pending: Array<{ chunk: TextChunk; metadata: ReturnType<typeof chunkMetadataService.enrich> }> = [];

      for (const chunk of batch) {
        const metadata = chunkMetadataService.enrich(chunk);
        const key = chunkStorageKey(chunk.sourceType, chunk.sourceId, chunk.chunkIndex);
        const existing = existingEmbeddings?.get(key);

        if (
          existing?.contentHash === metadata.contentHash &&
          existing.embedding.length > 0
        ) {
          stored.push(this.toStoredChunk(workspaceId, meetingId, chunk, metadata, existing.embedding, existing.embeddingModel));
          skipped += 1;
          continue;
        }

        pending.push({ chunk, metadata });
      }

      if (pending.length === 0) {
        continue;
      }

      const { embeddings, model } = await embeddingService.generateBatch(
        pending.map((entry) => entry.chunk.content),
        workspaceId,
      );

      pending.forEach((entry, index) => {
        stored.push(
          this.toStoredChunk(
            workspaceId,
            meetingId,
            entry.chunk,
            entry.metadata,
            embeddings[index] ?? [],
            model,
          ),
        );
      });

      if (jobId) {
        await embeddingRepository.updateProgress(jobId, stored.length);
      }
    }

    return { stored, skipped };
  }

  private toStoredChunk(
    workspaceId: string,
    meetingId: string | undefined,
    chunk: TextChunk,
    metadata: Record<string, unknown>,
    embedding: number[],
    embeddingModel: string,
  ): StoredChunkInput {
    const sourceType = normalizeChunkSourceType(chunk.sourceType);
    return {
      workspaceId,
      meetingId,
      sourceType,
      sourceId: chunk.sourceId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding,
      embeddingModel,
      metadata: {
        ...metadata,
        ...(chunk.sourceType === 'task' ? { entityKind: 'task' } : {}),
      },
    };
  }
}

export const entityEmbeddingService = new EntityEmbeddingService();
