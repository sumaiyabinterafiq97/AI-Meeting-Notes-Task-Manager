import { METRIC_NAMES } from './metrics.constants';
import { metricsStore } from './metrics-store';
import type { HistogramSnapshot, LatencyMetric, MetricLabels } from './metrics.types';
import { buildMetricsSnapshot, exportPrometheusText } from './metrics-exporter';
import { structuredLogger } from '../logging/structured-logger';

/**
 * Central metrics collection — counters, histograms, gauges.
 * In-memory store with Prometheus export; sink to external TSDB via scrape endpoint.
 */
export class MetricsService {
  recordLatency(name: string, valueMs: number, labels?: MetricLabels): void {
    const metric: LatencyMetric = {
      name,
      valueMs,
      labels,
      timestamp: new Date().toISOString(),
    };

    metricsStore.recordHistogram(name, valueMs, labels);
    metricsStore.incrementCounter(METRIC_NAMES.REQUEST_COUNT, labels);

    if (labels?.status === 'error' || labels?.status === 'failed') {
      metricsStore.incrementCounter(METRIC_NAMES.REQUEST_FAILURE, labels);
    } else {
      metricsStore.incrementCounter(METRIC_NAMES.REQUEST_SUCCESS, labels);
    }

    if (process.env.NODE_ENV === 'development') {
      structuredLogger.debug({ component: 'metrics', metric }, 'metric recorded');
    }
  }

  incrementCounter(name: string, labels?: MetricLabels, delta = 1): void {
    metricsStore.incrementCounter(name, labels, delta);
  }

  recordCacheHit(namespace: string, labels?: MetricLabels): void {
    metricsStore.incrementCounter(METRIC_NAMES.CACHE_HIT, { ...labels, namespace });
  }

  recordCacheMiss(namespace: string, labels?: MetricLabels): void {
    metricsStore.incrementCounter(METRIC_NAMES.CACHE_MISS, { ...labels, namespace });
  }

  recordRetry(labels?: MetricLabels): void {
    metricsStore.incrementCounter(METRIC_NAMES.RETRY_COUNT, labels);
  }

  recordRateLimitViolation(labels?: MetricLabels): void {
    metricsStore.incrementCounter(METRIC_NAMES.RATE_LIMIT_VIOLATION, labels);
  }

  recordProviderOutage(provider: string, labels?: MetricLabels): void {
    metricsStore.incrementCounter(METRIC_NAMES.PROVIDER_OUTAGE, { ...labels, provider });
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    metricsStore.setGauge(name, value, labels);
  }

  getHistogram(name: string, labels?: MetricLabels): HistogramSnapshot {
    return metricsStore.getHistogramSnapshot(name, labels);
  }

  getSnapshot() {
    return buildMetricsSnapshot();
  }

  exportPrometheus(): string {
    return exportPrometheusText();
  }

  reset(): void {
    metricsStore.reset();
  }
}

export const metricsService = new MetricsService();
