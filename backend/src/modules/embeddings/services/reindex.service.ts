import { prisma } from '../../../config/database';
import { meetingEmbeddingService } from './meeting-embedding.service';
import { ragCacheService } from '../../rag/services/rag-cache.service';
import {
  reindexObservabilityService,
  type ReindexReason,
} from './reindex-observability.service';

export interface ReindexWorkspaceResult {
  workspaceId: string;
  meetingsProcessed: number;
  meetingsFailed: number;
  totalChunksStored: number;
  totalMeetings: number;
  reason?: ReindexReason;
  latencyMs: number;
}

export interface ReindexWorkspaceOptions {
  workspaceId: string;
  reason?: ReindexReason;
  onProgress?: (progress: Omit<ReindexWorkspaceResult, 'latencyMs' | 'reason'>) => void;
}

const BATCH_SIZE = 50;
const PROGRESS_LOG_INTERVAL = 10;

/**
 * Workspace reindex — re-embed all meetings in batches (embedding-flow §7).
 * Used after model upgrades or admin-triggered rebuilds.
 */
export class ReindexService {
  async reindexWorkspace(options: ReindexWorkspaceOptions | string): Promise<ReindexWorkspaceResult> {
    const params = typeof options === 'string' ? { workspaceId: options } : options;
    const startedAt = Date.now();
    const { workspaceId, reason, onProgress } = params;

    const meetings = await prisma.meeting.findMany({
      where: { workspaceId, deletedAt: null, status: 'READY' },
      select: { id: true },
      orderBy: { meetingDate: 'desc' },
    });

    reindexObservabilityService.recordStarted({
      workspaceId,
      reason,
      totalMeetings: meetings.length,
    });

    let meetingsProcessed = 0;
    let meetingsFailed = 0;
    let totalChunksStored = 0;

    try {
      for (let offset = 0; offset < meetings.length; offset += BATCH_SIZE) {
        const batch = meetings.slice(offset, offset + BATCH_SIZE);

        for (const meeting of batch) {
          try {
            const result = await meetingEmbeddingService.refreshMeeting(meeting.id, workspaceId);
            meetingsProcessed += 1;
            totalChunksStored += result.chunksStored;
          } catch {
            meetingsFailed += 1;
          }

          if (meetingsProcessed % PROGRESS_LOG_INTERVAL === 0 || meetingsProcessed === meetings.length) {
            const progress = {
              workspaceId,
              totalMeetings: meetings.length,
              meetingsProcessed,
              meetingsFailed,
              totalChunksStored,
            };
            reindexObservabilityService.recordProgress({ ...progress, reason });
            onProgress?.(progress);
          }
        }
      }

      await ragCacheService.invalidateWorkspace(workspaceId);

      const result: ReindexWorkspaceResult = {
        workspaceId,
        meetingsProcessed,
        meetingsFailed,
        totalChunksStored,
        totalMeetings: meetings.length,
        reason,
        latencyMs: Date.now() - startedAt,
      };

      reindexObservabilityService.recordCompleted({
        ...result,
        success: meetingsFailed === 0,
      });

      return result;
    } catch (error) {
      reindexObservabilityService.recordFailed(error, { workspaceId, reason });
      throw error;
    }
  }
}

export const reindexService = new ReindexService();
