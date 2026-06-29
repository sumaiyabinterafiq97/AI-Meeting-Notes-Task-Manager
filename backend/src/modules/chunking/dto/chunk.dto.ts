import type { ChunkSourceType, TextChunk } from '../types/chunk.types';

export interface ChunkStatsDto {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  bySourceType: Record<string, number>;
  strategiesUsed: string[];
}

export interface ChunkResultDto {
  chunks: TextChunk[];
  stats: ChunkStatsDto;
}

export interface ChunkRelationshipDto {
  sourceType: ChunkSourceType;
  sourceId: string;
  meetingId?: string;
  parentMeetingId?: string;
  chunkCount: number;
}
