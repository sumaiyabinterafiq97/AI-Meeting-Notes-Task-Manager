import type { ReindexReason } from '../services/reindex-observability.service';

export interface ReindexWorkspaceRequestDto {
  reason?: ReindexReason;
}

export interface ReindexWorkspaceResponseDto {
  queued: boolean;
  result?: {
    workspaceId: string;
    meetingsProcessed: number;
    meetingsFailed: number;
    totalChunksStored: number;
    latencyMs: number;
  };
}
