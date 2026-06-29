import { metricsService } from '../../../src/modules/observability/metrics/metrics.service';
import { METRIC_NAMES } from '../../../src/modules/observability/metrics/metrics.constants';
import { costTrackerService } from '../../../src/modules/observability/cost-tracking/cost-tracker.service';
import { cacheObservabilityService } from '../../../src/modules/observability/cache/cache-observability.service';
import { latencyTrackerService } from '../../../src/modules/observability/latency/latency-tracker.service';
import { retryObservabilityService } from '../../../src/modules/observability/retry/retry-observability.service';
import { rateLimitTrackerService } from '../../../src/modules/observability/rate-limit/rate-limit-tracker.service';
import { performanceAnalyzerService } from '../../../src/modules/observability/dashboards/performance-analyzer.service';
import { alertService } from '../../../src/modules/observability/alerts/alert.service';
import type { OptimizationInsight } from '../../../src/modules/observability/dashboards/performance-analyzer.service';
import type { Alert } from '../../../src/modules/observability/alerts/alert.types';

describe('MetricsService', () => {
  beforeEach(() => metricsService.reset());

  it('records latency histograms with percentiles', () => {
    for (const ms of [100, 200, 300, 400, 500]) {
      metricsService.recordLatency(METRIC_NAMES.LATENCY, ms, { workspaceId: 'ws-1' });
    }

    const hist = metricsService.getHistogram(METRIC_NAMES.LATENCY, { workspaceId: 'ws-1' });
    expect(hist.count).toBe(5);
    expect(hist.p50).toBeGreaterThan(0);
    expect(hist.p95).toBeGreaterThanOrEqual(hist.p50);
  });

  it('exports prometheus text format', () => {
    metricsService.incrementCounter('test.counter', { workspaceId: 'ws-1' });
    const text = metricsService.exportPrometheus();
    expect(text).toContain('test_counter');
  });
});

describe('CostTrackerService', () => {
  it('estimates OpenAI gpt-4o cost', () => {
    const cost = costTrackerService.estimate('gpt-4o', 1_000_000, 100_000);
    expect(cost).toBeCloseTo(3.5, 1);
  });

  it('estimates Claude cost', () => {
    const result = costTrackerService.estimateDetailed({
      model: 'claude-3-5-sonnet-latest',
      promptTokens: 100_000,
      completionTokens: 10_000,
    });
    expect(result.provider).toBe('anthropic');
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('returns zero cost for mock provider', () => {
    expect(costTrackerService.estimate('mock', 10_000, 5_000)).toBe(0);
  });
});

describe('CacheObservabilityService', () => {
  beforeEach(() => cacheObservabilityService.reset());

  it('tracks hits and misses by namespace', () => {
    cacheObservabilityService.record({ namespace: 'rag:ret', hit: true, workspaceId: 'ws-1' });
    cacheObservabilityService.record({ namespace: 'rag:ret', hit: false, workspaceId: 'ws-1' });

    const stats = cacheObservabilityService.getSnapshot();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('alerts on low hit rate', () => {
    for (let i = 0; i < 25; i += 1) {
      cacheObservabilityService.record({ namespace: 'rag:ret', hit: false });
    }
    expect(cacheObservabilityService.checkHitRateAlert(0.2)).toContain('below');
  });
});

describe('LatencyTrackerService', () => {
  beforeEach(() => {
    latencyTrackerService.reset();
    metricsService.reset();
  });

  it('detects slow requests', () => {
    latencyTrackerService.record('slow-op', 35_000, { workspaceId: 'ws-1' }, 'agent');
    expect(latencyTrackerService.getSlowRequests()).toHaveLength(1);
  });
});

describe('RetryObservabilityService', () => {
  beforeEach(() => retryObservabilityService.reset());

  it('tracks retry events and provider outages', () => {
    retryObservabilityService.recordRetry({
      component: 'llm',
      attempt: 1,
      maxAttempts: 3,
      provider: 'openai',
      reason: '429 rate limit',
    });
    retryObservabilityService.recordProviderOutage('openai', '5xx errors');

    const stats = retryObservabilityService.getStats();
    expect(stats.totalRetries).toBe(1);
    expect(stats.providerOutages).toContain('openai');
  });
});

describe('RateLimitTrackerService', () => {
  beforeEach(() => rateLimitTrackerService.reset());

  it('records violations and detects abuse patterns', () => {
    for (let i = 0; i < 12; i += 1) {
      rateLimitTrackerService.recordViolation({
        scope: 'user',
        identifier: 'user-1',
        limit: 30,
        current: 31,
      });
    }

    const abuse = rateLimitTrackerService.detectAbusePattern(10, 60);
    expect(abuse.some((p: string) => p.includes('user-1'))).toBe(true);
  });
});

describe('PerformanceAnalyzerService', () => {
  beforeEach(() => {
    cacheObservabilityService.reset();
    retryObservabilityService.reset();
    latencyTrackerService.reset();
    metricsService.reset();
  });

  it('recommends caching when hit rate is low', () => {
    for (let i = 0; i < 15; i += 1) {
      cacheObservabilityService.record({ namespace: 'rag:ret', hit: false });
    }

    const insights: OptimizationInsight[] = performanceAnalyzerService.analyze();
    expect(insights.some((i) => i.recommendation === 'enable_caching')).toBe(true);
  });
});

describe('AlertService', () => {
  beforeEach(() => alertService.reset());

  it('evaluates cache hit rate alerts', async () => {
    for (let i = 0; i < 25; i += 1) {
      cacheObservabilityService.record({ namespace: 'rag:ret', hit: false });
    }

    const alerts: Alert[] = await alertService.evaluate();
    expect(alerts.some((a) => a.type === 'low_cache_hit_ratio')).toBe(true);
  });
});

describe('failure and provider outage tests', () => {
  beforeEach(() => {
    retryObservabilityService.reset();
    metricsService.reset();
  });

  it('increments provider outage metric', () => {
    retryObservabilityService.recordProviderOutage('anthropic', 'connection refused');
    const stats = retryObservabilityService.getStats();
    expect(stats.providerOutages).toContain('anthropic');
  });
});

describe('load simulation', () => {
  beforeEach(() => metricsService.reset());

  it('handles concurrent metric recordings', async () => {
    const tasks = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve(
        metricsService.recordLatency(METRIC_NAMES.LATENCY, 50 + i, { workspaceId: `ws-${i % 5}` }),
      ),
    );
    await Promise.all(tasks);

    const snapshot = metricsService.getSnapshot();
    expect(snapshot.collectedAt).toBeDefined();
  });
});
