import { llmLogger } from '../logging/llm-logger';
import { metricsService } from '../metrics/metrics.service';
import {
  CACHE_HIT_RATE_ALERT_THRESHOLD,
  CACHE_MIN_SAMPLES_FOR_ALERT,
  type CacheNamespace,
} from './cache.constants';

export interface CacheEventMetrics {
  namespace: CacheNamespace | string;
  hit: boolean;
  workspaceId?: string;
}

export interface CacheStatsSnapshot {
  hits: number;
  misses: number;
  hitRate: number;
  byNamespace: Record<string, { hits: number; misses: number; hitRate: number }>;
}

/**
 * Unified cache observability — hit/miss tracking across all cache layers.
 */
export class CacheObservabilityService {
  private hits = 0;
  private misses = 0;
  private namespaceStats = new Map<string, { hits: number; misses: number }>();

  record(metrics: CacheEventMetrics): void {
    if (metrics.hit) {
      this.hits += 1;
      metricsService.recordCacheHit(metrics.namespace, { workspaceId: metrics.workspaceId });
    } else {
      this.misses += 1;
      metricsService.recordCacheMiss(metrics.namespace, { workspaceId: metrics.workspaceId });
    }

    const bucket = this.namespaceStats.get(metrics.namespace) ?? { hits: 0, misses: 0 };
    if (metrics.hit) {
      bucket.hits += 1;
    } else {
      bucket.misses += 1;
    }
    this.namespaceStats.set(metrics.namespace, bucket);

    llmLogger.debug(
      {
        event: metrics.hit ? 'cache.hit' : 'cache.miss',
        namespace: metrics.namespace,
        workspaceId: metrics.workspaceId,
        hitRate: Number(this.getSnapshot().hitRate.toFixed(3)),
      },
      metrics.hit ? 'Cache hit' : 'Cache miss',
    );
  }

  getSnapshot(): CacheStatsSnapshot {
    const total = this.hits + this.misses;
    const byNamespace: CacheStatsSnapshot['byNamespace'] = {};

    for (const [namespace, stats] of this.namespaceStats.entries()) {
      const nsTotal = stats.hits + stats.misses;
      byNamespace[namespace] = {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: nsTotal > 0 ? stats.hits / nsTotal : 0,
      };
    }

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      byNamespace,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.namespaceStats.clear();
  }

  checkHitRateAlert(threshold = CACHE_HIT_RATE_ALERT_THRESHOLD): string | null {
    const snapshot = this.getSnapshot();
    const total = snapshot.hits + snapshot.misses;
    if (total < CACHE_MIN_SAMPLES_FOR_ALERT) return null;
    if (snapshot.hitRate < threshold) {
      return `Cache hit rate ${(snapshot.hitRate * 100).toFixed(1)}% below ${threshold * 100}% threshold`;
    }
    return null;
  }
}

export const cacheObservabilityService = new CacheObservabilityService();
