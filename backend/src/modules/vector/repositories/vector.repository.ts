import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { DocumentChunk, HybridSearchQuery, VectorSearchQuery } from '../types/vector.types';
import { fromPrismaSourceType, toPgVectorLiteral, toPrismaSourceType } from '../utils/source-type';
import { buildMeetingDateFilter } from './date-filter';

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

    const { fromFilter, toFilter } = buildMeetingDateFilter(query.dateFrom, query.dateTo);

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
        ${fromFilter}
        ${toFilter}
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

    const { fromFilter, toFilter } = buildMeetingDateFilter(query.dateFrom, query.dateTo);

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
        ${fromFilter}
        ${toFilter}
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

  async findMeetingChunkEmbeddings(
    meetingId: string,
  ): Promise<Map<string, { contentHash?: string; embedding: number[]; embeddingModel: string }>> {
    const rows = await prisma.$queryRaw<
      Array<{
        source_type: string;
        source_id: string;
        chunk_index: number;
        metadata: unknown;
        embedding_text: string | null;
        embedding_model: string;
      }>
    >`
      SELECT
        source_type::text AS source_type,
        source_id,
        chunk_index,
        metadata,
        embedding::text AS embedding_text,
        embedding_model
      FROM document_chunks
      WHERE meeting_id = ${meetingId}::uuid
        AND embedding IS NOT NULL
    `;

    const map = new Map<string, { contentHash?: string; embedding: number[]; embeddingModel: string }>();

    for (const row of rows) {
      if (!row.embedding_text) continue;
      const key = `${fromPrismaSourceType(row.source_type as never)}:${row.source_id}:${row.chunk_index}`;
      const metadata = (row.metadata as Record<string, unknown>) ?? {};
      map.set(key, {
        contentHash: typeof metadata.contentHash === 'string' ? metadata.contentHash : undefined,
        embedding: parsePgVector(row.embedding_text),
        embeddingModel: row.embedding_model,
      });
    }

    return map;
  }
}

function parsePgVector(value: string): number[] {
  const trimmed = value.replace(/^\[/, '').replace(/\]$/, '');
  if (!trimmed) return [];
  return trimmed.split(',').map((part) => Number.parseFloat(part.trim()));
}

export const vectorRepository = new VectorRepository();
