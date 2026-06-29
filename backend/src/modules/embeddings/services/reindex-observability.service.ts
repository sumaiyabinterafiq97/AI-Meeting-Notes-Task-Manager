import { llmLogger } from '../../observability/logging/llm-logger';

export type ReindexReason = 'model_upgrade' | 'admin' | 'corruption';

export interface ReindexProgressMetrics {
  workspaceId: string;
  reason?: ReindexReason;
  totalMeetings: number;
  meetingsProcessed: number;
  meetingsFailed: number;
  totalChunksStored: number;
}

export interface ReindexCompletedMetrics extends ReindexProgressMetrics {
  latencyMs: number;
  success: boolean;
}

/** Structured telemetry for workspace reindex jobs. */
export class ReindexObservabilityService {
  recordStarted(metrics: { workspaceId: string; reason?: ReindexReason; totalMeetings: number }): void {
    llmLogger.info(
      {
        event: 'reindex.started',
        workspaceId: metrics.workspaceId,
        reason: metrics.reason ?? 'admin',
        totalMeetings: metrics.totalMeetings,
      },
      'Workspace reindex started',
    );
  }

  recordProgress(metrics: ReindexProgressMetrics): void {
    llmLogger.info(
      {
        event: 'reindex.progress',
        workspaceId: metrics.workspaceId,
        reason: metrics.reason,
        totalMeetings: metrics.totalMeetings,
        meetingsProcessed: metrics.meetingsProcessed,
        meetingsFailed: metrics.meetingsFailed,
        totalChunksStored: metrics.totalChunksStored,
        percentComplete:
          metrics.totalMeetings > 0
            ? Number(((metrics.meetingsProcessed / metrics.totalMeetings) * 100).toFixed(1))
            : 100,
      },
      'Workspace reindex progress',
    );
  }

  recordCompleted(metrics: ReindexCompletedMetrics): void {
    llmLogger.info(
      {
        event: 'reindex.completed',
        workspaceId: metrics.workspaceId,
        reason: metrics.reason,
        totalMeetings: metrics.totalMeetings,
        meetingsProcessed: metrics.meetingsProcessed,
        meetingsFailed: metrics.meetingsFailed,
        totalChunksStored: metrics.totalChunksStored,
        latencyMs: metrics.latencyMs,
        success: metrics.success,
      },
      'Workspace reindex completed',
    );
  }

  recordFailed(error: unknown, context: { workspaceId: string; reason?: ReindexReason }): void {
    llmLogger.error(
      {
        event: 'reindex.failed',
        workspaceId: context.workspaceId,
        reason: context.reason,
        error: error instanceof Error ? error.message : String(error),
      },
      'Workspace reindex failed',
    );
  }
}

export const reindexObservabilityService = new ReindexObservabilityService();
