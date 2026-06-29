import { prisma } from '../../../config/database';
import type { DocumentSourceType } from '../types/vector.types';
import { vectorRepository, type StoredChunkInput } from '../repositories/vector.repository';
import type { VectorStorageStatsDto } from '../dto/vector.dto';
import { storedChunkSchema } from '../schemas/vector.schema';
import { filterValidatorService } from './filter-validator.service';

/**
 * High-level pgvector storage operations — upsert, delete, workspace stats.
 */
export class VectorStorageService {
  async storeMeetingChunks(
    meetingId: string,
    workspaceId: string,
    chunks: StoredChunkInput[],
  ): Promise<number> {
    for (const chunk of chunks) {
      storedChunkSchema.parse(chunk);
    }
    filterValidatorService.validate({
      workspaceId,
      query: 'storage',
      mode: 'semantic',
      meetingId,
    });
    await vectorRepository.replaceMeetingChunks(meetingId, workspaceId, chunks);
    return chunks.length;
  }

  async storeSourceChunks(params: {
    workspaceId: string;
    sourceType: DocumentSourceType;
    sourceId: string;
    chunks: StoredChunkInput[];
  }): Promise<number> {
    for (const chunk of params.chunks) {
      storedChunkSchema.parse(chunk);
    }
    await vectorRepository.replaceSourceChunks(params);
    return params.chunks.length;
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    await vectorRepository.deleteByMeeting(meetingId);
  }

  async getWorkspaceStats(workspaceId: string): Promise<VectorStorageStatsDto> {
    const rows = await prisma.documentChunk.groupBy({
      by: ['sourceType'],
      where: { workspaceId },
      _count: { _all: true },
    });

    const embedded = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM document_chunks
      WHERE workspace_id = ${workspaceId}::uuid
        AND embedding IS NOT NULL
    `;

    const bySourceType: Record<string, number> = {};
    let totalChunks = 0;
    for (const row of rows) {
      bySourceType[row.sourceType] = row._count._all;
      totalChunks += row._count._all;
    }

    return {
      workspaceId,
      totalChunks,
      embeddedChunks: Number(embedded[0]?.count ?? 0),
      bySourceType,
    };
  }
}

export const vectorStorageService = new VectorStorageService();
