import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { DocumentChunk, HybridSearchQuery, VectorSearchQuery } from '../types/vector.types';
import { fromPrismaSourceType, toPgVectorLiteral, toPrismaSourceType } from '../utils/source-type';

interface ChunkRow {
  id: string;
  workspace_id: string;
  meeting_id: string | null;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: unknown;
  similarity?: number;
  rank_score?: number;
}

function mapRow(row: ChunkRow): DocumentChunk {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    meetingId: row.meeting_id ?? undefined,
    sourceType: fromPrismaSourceType(row.source_type as never),
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    tokenCount: row.token_count,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    similarity: row.similarity ?? row.rank_score,
  };
}

export interface StoredChunkInput {
  workspaceId: string;
  meetingId?: string;
  sourceType: DocumentChunk['sourceType'];
  sourceId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[];
  embeddingModel: string;
  metadata?: Record<string, unknown>;
}

export class VectorRepository {
  async similaritySearch(query: VectorSearchQuery): Promise<DocumentChunk[]> {
    if (query.queryVector.length === 0) {
      return [];
    }

    const topK = query.topK ?? 20;
    const minSimilarity = query.minSimilarity ?? 0;
    const vectorLiteral = toPgVectorLiteral(query.queryVector);

    const sourceTypeFilter =
      query.sourceTypes && query.sourceTypes.length > 0
        ? Prisma.sql`AND source_type IN (${Prisma.join(
            query.sourceTypes.map((type) => Prisma.sql`${toPrismaSourceType(type)}::"DocumentSourceType"`),
          )})`
        : Prisma.empty;

    const meetingFilter = query.meetingId
      ? Prisma.sql`AND meeting_id = ${query.meetingId}::uuid`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<ChunkRow[]>`
      SELECT
        id,
        workspace_id,
        meeting_id,
        source_type::text,
        source_id,
        chunk_index,
        content,
        token_count,
        metadata,
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM document_chunks
      WHERE workspace_id = ${query.workspaceId}::uuid
        AND embedding IS NOT NULL
        ${meetingFilter}
        ${sourceTypeFilter}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;

    return rows
      .filter((row) => (row.similarity ?? 0) >= minSimilarity)
      .map(mapRow);
  }

  async keywordSearch(query: HybridSearchQuery): Promise<DocumentChunk[]> {
    const topK = query.topK ?? 20;
    const searchQuery = query.query.trim();
    if (!searchQuery) return [];

    const sourceTypeFilter =
      query.sourceTypes && query.sourceTypes.length > 0
        ? Prisma.sql`AND source_type IN (${Prisma.join(
            query.sourceTypes.map((type) => Prisma.sql`${toPrismaSourceType(type)}::"DocumentSourceType"`),
          )})`
        : Prisma.empty;

    const meetingFilter = query.meetingId
      ? Prisma.sql`AND meeting_id = ${query.meetingId}::uuid`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<ChunkRow[]>`
      SELECT
        id,
        workspace_id,
        meeting_id,
        source_type::text,
        source_id,
        chunk_index,
        content,
        token_count,
        metadata,
        ts_rank(search_vector, plainto_tsquery('english', ${searchQuery})) AS rank_score
      FROM document_chunks
      WHERE workspace_id = ${query.workspaceId}::uuid
        AND search_vector @@ plainto_tsquery('english', ${searchQuery})
        ${meetingFilter}
        ${sourceTypeFilter}
      ORDER BY rank_score DESC
      LIMIT ${topK}
    `;

    return rows.map(mapRow);
  }

  async replaceSourceChunks(params: {
    workspaceId: string;
    sourceType: DocumentChunk['sourceType'];
    sourceId: string;
    chunks: StoredChunkInput[];
  }): Promise<void> {
    const prismaSourceType = toPrismaSourceType(params.sourceType);

    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: {
          workspaceId: params.workspaceId,
          sourceId: params.sourceId,
          sourceType: prismaSourceType,
        },
      });

      for (const chunk of params.chunks) {
        const id = randomUUID();
        const vectorLiteral = toPgVectorLiteral(chunk.embedding);
        const metadataJson = JSON.stringify(chunk.metadata ?? {});

        await tx.$executeRaw`
          INSERT INTO document_chunks (
            id,
            workspace_id,
            meeting_id,
            source_type,
            source_id,
            chunk_index,
            content,
            token_count,
            embedding,
            embedding_model,
            metadata,
            created_at,
            updated_at
          ) VALUES (
            ${id}::uuid,
            ${chunk.workspaceId}::uuid,
            ${chunk.meetingId ?? null}::uuid,
            ${toPrismaSourceType(chunk.sourceType)}::"DocumentSourceType",
            ${chunk.sourceId}::uuid,
            ${chunk.chunkIndex},
            ${chunk.content},
            ${chunk.tokenCount},
            ${vectorLiteral}::vector,
            ${chunk.embeddingModel},
            ${metadataJson}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    });
  }

  async replaceMeetingChunks(
    meetingId: string,
    workspaceId: string,
    chunks: StoredChunkInput[],
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: { meetingId, workspaceId },
      });

      for (const chunk of chunks) {
        const id = randomUUID();
        const vectorLiteral = toPgVectorLiteral(chunk.embedding);
        const metadataJson = JSON.stringify(chunk.metadata ?? {});

        await tx.$executeRaw`
          INSERT INTO document_chunks (
            id,
            workspace_id,
            meeting_id,
            source_type,
            source_id,
            chunk_index,
            content,
            token_count,
            embedding,
            embedding_model,
            metadata,
            created_at,
            updated_at
          ) VALUES (
            ${id}::uuid,
            ${workspaceId}::uuid,
            ${meetingId}::uuid,
            ${toPrismaSourceType(chunk.sourceType)}::"DocumentSourceType",
            ${chunk.sourceId}::uuid,
            ${chunk.chunkIndex},
            ${chunk.content},
            ${chunk.tokenCount},
            ${vectorLiteral}::vector,
            ${chunk.embeddingModel},
            ${metadataJson}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    });
  }

  async deleteByMeeting(meetingId: string): Promise<void> {
    await prisma.documentChunk.deleteMany({ where: { meetingId } });
  }

  async countByMeeting(meetingId: string): Promise<number> {
    return prisma.documentChunk.count({ where: { meetingId } });
  }
}

export const vectorRepository = new VectorRepository();
