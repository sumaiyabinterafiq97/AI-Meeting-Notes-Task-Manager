import type { EmbeddingJobStatus } from '@prisma/client';

export interface EmbedMeetingResultDto {
  jobId: string;
  meetingId: string;
  workspaceId: string;
  chunksStored: number;
  chunksSkipped?: number;
}

export interface EmbeddingJobStatusDto {
  id: string;
  workspaceId: string;
  meetingId: string | null;
  status: EmbeddingJobStatus;
  chunksTotal: number;
  chunksProcessed: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ReindexWorkspaceResultDto {
  workspaceId: string;
  meetingsProcessed: number;
  meetingsFailed: number;
  totalChunksStored: number;
}

export interface EmbeddingBatchStatsDto {
  model: string;
  dimensions: number;
  totalTokens: number;
  cacheHits: number;
  cacheMisses: number;
  latencyMs: number;
  estimatedCostUsd: number;
  retries: number;
}
