import type { ChunkResultDto, ChunkRelationshipDto, ChunkStatsDto } from '../dto/chunk.dto';
import type { ChunkInput, TextChunk } from '../types/chunk.types';

export class ChunkStatsService {
  compute(chunks: TextChunk[]): ChunkStatsDto {
    const bySourceType: Record<string, number> = {};
    const strategies = new Set<string>();
    let totalTokens = 0;

    for (const chunk of chunks) {
      bySourceType[chunk.sourceType] = (bySourceType[chunk.sourceType] ?? 0) + 1;
      totalTokens += chunk.tokenCount;
      const strategy =
        typeof chunk.metadata.chunkingStrategy === 'string'
          ? chunk.metadata.chunkingStrategy
          : undefined;
      if (strategy) strategies.add(strategy);
    }

    return {
      totalChunks: chunks.length,
      totalTokens,
      avgTokensPerChunk: chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0,
      bySourceType,
      strategiesUsed: [...strategies],
    };
  }

  buildResult(chunks: TextChunk[]): ChunkResultDto {
    return { chunks, stats: this.compute(chunks) };
  }

  relationships(inputs: ChunkInput[], chunks: TextChunk[]): ChunkRelationshipDto[] {
    const grouped = new Map<string, ChunkRelationshipDto>();

    for (const input of inputs) {
      const key = `${input.sourceType}:${input.sourceId}`;
      grouped.set(key, {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        meetingId: input.meetingId,
        parentMeetingId: input.meetingId,
        chunkCount: 0,
      });
    }

    for (const chunk of chunks) {
      const key = `${chunk.sourceType}:${chunk.sourceId}`;
      const entry = grouped.get(key);
      if (entry) entry.chunkCount += 1;
    }

    return [...grouped.values()];
  }
}

export const chunkStatsService = new ChunkStatsService();
