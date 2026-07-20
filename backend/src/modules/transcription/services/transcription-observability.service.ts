import { metricsService } from '../../observability/metrics/metrics.service';
import { structuredLogger } from '../../observability/logging/structured-logger';
import { METRIC_NAMES } from '../../observability/metrics/metrics.constants';

const TRANSCRIPTION_LATENCY = 'transcription.duration';
const TRANSCRIPTION_BYTES = 'transcription.audio.bytes';

export interface TranscriptionObsContext {
  workspaceId: string;
  meetingId: string;
  audioId: string;
  provider: string;
  fileSizeBytes: number;
  attempt?: number;
}

/**
 * Transcription metrics + safe logs (never secrets, raw audio, or full transcript).
 */
export class TranscriptionObservabilityService {
  recordStart(ctx: TranscriptionObsContext): void {
    metricsService.setGauge(TRANSCRIPTION_BYTES, ctx.fileSizeBytes, {
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      jobType: 'transcribe-audio',
    });

    structuredLogger.info(
      {
        component: 'transcription',
        workspaceId: ctx.workspaceId,
        meetingId: ctx.meetingId,
        audioId: ctx.audioId,
        provider: ctx.provider,
        fileSizeBytes: ctx.fileSizeBytes,
        attempt: ctx.attempt ?? 1,
      },
      'transcription started',
    );
  }

  recordSuccess(ctx: TranscriptionObsContext, durationMs: number, charCount: number): void {
    metricsService.recordLatency(TRANSCRIPTION_LATENCY, durationMs, {
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      jobType: 'transcribe-audio',
      status: 'success',
    });
    metricsService.incrementCounter(METRIC_NAMES.REQUEST_SUCCESS, {
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      jobType: 'transcribe-audio',
    });

    structuredLogger.info(
      {
        component: 'transcription',
        workspaceId: ctx.workspaceId,
        meetingId: ctx.meetingId,
        audioId: ctx.audioId,
        provider: ctx.provider,
        fileSizeBytes: ctx.fileSizeBytes,
        durationMs,
        charCount,
      },
      'transcription completed',
    );
  }

  recordFailure(ctx: TranscriptionObsContext, durationMs: number, errorMessage: string): void {
    metricsService.recordLatency(TRANSCRIPTION_LATENCY, durationMs, {
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      jobType: 'transcribe-audio',
      status: 'failed',
    });
    metricsService.incrementCounter(METRIC_NAMES.REQUEST_FAILURE, {
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      jobType: 'transcribe-audio',
    });

    structuredLogger.error(
      {
        component: 'transcription',
        workspaceId: ctx.workspaceId,
        meetingId: ctx.meetingId,
        audioId: ctx.audioId,
        provider: ctx.provider,
        fileSizeBytes: ctx.fileSizeBytes,
        durationMs,
        errorMessage: errorMessage.slice(0, 500),
      },
      'transcription failed',
    );
  }

  recordRetry(ctx: Pick<TranscriptionObsContext, 'workspaceId' | 'meetingId' | 'audioId'>): void {
    metricsService.recordRetry({
      workspaceId: ctx.workspaceId,
      jobType: 'transcribe-audio',
    });

    structuredLogger.info(
      {
        component: 'transcription',
        workspaceId: ctx.workspaceId,
        meetingId: ctx.meetingId,
        audioId: ctx.audioId,
      },
      'transcription retry enqueued',
    );
  }
}

export const transcriptionObservabilityService = new TranscriptionObservabilityService();
