import type { LatencyMetric, MetricLabels } from './metrics.types';

/**
 * Metrics service — latency and success rate tracking.
 * Implementation pending.
 */
export class MetricsService {
  recordLatency(name: string, valueMs: number, labels?: MetricLabels): void {
    const metric: LatencyMetric = {
      name,
      valueMs,
      labels,
      timestamp: new Date().toISOString(),
    };
    // Sink integration pending (Prometheus / Sentry)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[metrics]', metric.name, metric.valueMs, metric.labels);
    }
  }

  incrementCounter(_name: string, _labels?: MetricLabels): void {
    // Implementation pending
  }
}

export const metricsService = new MetricsService();
