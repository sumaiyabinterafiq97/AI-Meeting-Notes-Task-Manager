import { cacheObservabilityService } from '../cache/cache-observability.service';
import { latencyTrackerService } from '../latency/latency-tracker.service';
import { metricsService } from '../metrics/metrics.service';
import { retryObservabilityService } from '../retry/retry-observability.service';
import { structuredLogger } from '../logging/structured-logger';

export type OptimizationRecommendation =
  | 'enable_caching'
  | 'compress_context'
  | 'trim_prompt'
  | 'batch_embeddings'
  | 'switch_model'
  | 'reduce_retries'
  | 'reuse_summaries';

export interface OptimizationInsight {
  recommendation: OptimizationRecommendation;
  reason: string;
  estimatedSavingsPercent?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance and cost optimization analyzer — identifies inefficiencies and recommends fixes.
 */
export class PerformanceAnalyzerService {
  analyze(): OptimizationInsight[] {
    const insights: OptimizationInsight[] = [];
    const cacheStats = cacheObservabilityService.getSnapshot();
    const retryStats = retryObservabilityService.getStats();
    const slowRequests = latencyTrackerService.getSlowRequests();

    if (cacheStats.hitRate < 0.3 && cacheStats.hits + cacheStats.misses > 10) {
      insights.push({
        recommendation: 'enable_caching',
        reason: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}% — enable or tune response/retrieval caches`,
        estimatedSavingsPercent: 15,
      });
    }

    if (retryStats.totalRetries > 20) {
      insights.push({
        recommendation: 'reduce_retries',
        reason: `${retryStats.totalRetries} retries detected — review provider health and backoff policy`,
        metadata: { byProvider: retryStats.byProvider },
      });
    }

    const largeContextGauge = metricsService.getSnapshot().gauges['context.tokens'];
    if (largeContextGauge && largeContextGauge > 24_000) {
      insights.push({
        recommendation: 'compress_context',
        reason: 'Large context windows detected — enable context compression or trim low-relevance chunks',
        estimatedSavingsPercent: 20,
      });
    }

    for (const slow of slowRequests.filter((r) => r.category === 'retrieval')) {
      insights.push({
        recommendation: 'enable_caching',
        reason: `Slow retrieval (${slow.valueMs}ms) — cache query embeddings and retrieval results`,
        metadata: { latencyMs: slow.valueMs },
      });
    }

    for (const slow of slowRequests.filter((r) => r.category === 'embedding')) {
      insights.push({
        recommendation: 'batch_embeddings',
        reason: `Slow embedding (${slow.valueMs}ms) — increase batch size and deduplicate unchanged content`,
        estimatedSavingsPercent: 50,
      });
    }

    for (const slow of slowRequests.filter((r) => r.category === 'agent' || r.category === 'prompt')) {
      insights.push({
        recommendation: 'switch_model',
        reason: `Slow agent/prompt execution (${slow.valueMs}ms) — consider gpt-4o-mini for non-critical workflows`,
        estimatedSavingsPercent: 40,
        metadata: { model: slow.labels?.model },
      });
    }

    if (insights.length > 0) {
      structuredLogger.info(
        { component: 'performance', insightCount: insights.length },
        'optimization insights generated',
      );
    }

    return insights;
  }

  trackSavings(recommendation: OptimizationRecommendation, savedUsd: number): void {
    metricsService.incrementCounter('cost.optimization.savings', { namespace: recommendation }, savedUsd);
    structuredLogger.info(
      { component: 'cost-optimization', recommendation, savedUsd },
      'optimization savings tracked',
    );
  }
}

export const performanceAnalyzerService = new PerformanceAnalyzerService();
