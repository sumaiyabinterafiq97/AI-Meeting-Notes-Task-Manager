import { llmLogger } from '../../observability/logging/llm-logger';
import { latencyTrackerService } from '../../observability/latency/latency-tracker.service';
import { metricsService, METRIC_NAMES } from '../../observability';

export interface EmbeddingMetrics {
  workspaceId?: string;
  model: string;
  batchSize: number;
  totalTokens: number;
  cacheHits: number;
  cacheMisses: number;
  latencyMs: number;
  estimatedCostUsd?: number;
  retries?: number;
  provider: string;
}

/** Structured embedding telemetry — token usage, latency, cost, cache ratio. */
export class EmbeddingObservabilityService {
  record(metrics: EmbeddingMetrics): void {
    const cacheHitRatio =
      metrics.cacheHits + metrics.cacheMisses > 0
        ? metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
        : 0;

    latencyTrackerService.record(
      'embedding.batch',
      metrics.latencyMs,
      { workspaceId: metrics.workspaceId, provider: metrics.provider, model: metrics.model },
      'embedding',
    );
    metricsService.recordLatency(METRIC_NAMES.EMBEDDING_TIME, metrics.latencyMs, {
      workspaceId: metrics.workspaceId,
      provider: metrics.provider,
      model: metrics.model,
    });

    llmLogger.info(
      {
        event: 'embedding.generated',
        provider: metrics.provider,
        model: metrics.model,
        workspaceId: metrics.workspaceId,
        batchSize: metrics.batchSize,
        totalTokens: metrics.totalTokens,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        cacheHitRatio: Number(cacheHitRatio.toFixed(3)),
        latencyMs: metrics.latencyMs,
        estimatedCostUsd: metrics.estimatedCostUsd,
        retries: metrics.retries ?? 0,
      },
      'Embedding batch completed',
    );
  }

  recordFailure(error: unknown, context: { workspaceId?: string; provider: string }): void {
    llmLogger.error(
      {
        event: 'embedding.failed',
        provider: context.provider,
        workspaceId: context.workspaceId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Embedding generation failed',
    );
  }
}

export const embeddingObservabilityService = new EmbeddingObservabilityService();
