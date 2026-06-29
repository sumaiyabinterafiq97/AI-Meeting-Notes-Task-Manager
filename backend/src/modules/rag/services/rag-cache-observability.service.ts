import { cacheObservabilityService } from '../../observability/cache/cache-observability.service';
import type { CacheEventMetrics, CacheStatsSnapshot } from '../../observability/cache/cache-observability.service';

export type CacheNamespace = 'rag:ret' | 'rag:ctx' | 'rag:emb' | 'emb';

/**
 * RAG cache observability — delegates to central cache observability service.
 * @see docs/observability-requirements.md §11
 */
export class RagCacheObservabilityService {
  record(metrics: CacheEventMetrics): void {
    cacheObservabilityService.record(metrics);
  }

  getSnapshot(): CacheStatsSnapshot {
    return cacheObservabilityService.getSnapshot();
  }

  reset(): void {
    cacheObservabilityService.reset();
  }

  checkHitRateAlert(threshold = 0.2): string | null {
    return cacheObservabilityService.checkHitRateAlert(threshold);
  }
}

export const ragCacheObservabilityService = new RagCacheObservabilityService();
