import { METRIC_NAMES, SLOW_REQUEST_THRESHOLD_MS } from '../metrics/metrics.constants';
import { metricsService } from '../metrics/metrics.service';
import type { MetricLabels } from '../metrics/metrics.types';
import { structuredLogger } from '../logging/structured-logger';
import type { LatencyCategory, LatencyRecord, LatencySummary } from './latency.types';

const CATEGORY_METRIC: Record<LatencyCategory, string> = {
  embedding: METRIC_NAMES.EMBEDDING_TIME,
  retrieval: METRIC_NAMES.RETRIEVAL_TIME,
  prompt: METRIC_NAMES.PROMPT_TIME,
  agent: METRIC_NAMES.AGENT_TIME,
  chat: 'chat.latency',
  queue: METRIC_NAMES.QUEUE_TIME,
  database: 'db.query.duration',
  graph: METRIC_NAMES.GRAPH_TIME,
  e2e: 'request.e2e.duration',
};

/**
 * Latency monitoring — histograms with P50/P95/P99 and slow-request detection.
 */
export class LatencyTrackerService {
  private slowRequests: LatencyRecord[] = [];
  private readonly maxSlowRequests = 100;

  record(name: string, valueMs: number, labels?: MetricLabels, category?: LatencyCategory): void {
    const metricName = category ? CATEGORY_METRIC[category] : METRIC_NAMES.LATENCY;
    metricsService.recordLatency(metricName, valueMs, labels);

    const slow = valueMs >= SLOW_REQUEST_THRESHOLD_MS;
    const record: LatencyRecord = {
      category: category ?? 'e2e',
      name,
      valueMs,
      labels,
      timestamp: new Date().toISOString(),
      slow,
    };

    if (slow) {
      this.slowRequests.push(record);
      if (this.slowRequests.length > this.maxSlowRequests) {
        this.slowRequests.shift();
      }
      structuredLogger.warn(
        {
          component: 'latency',
          name,
          valueMs,
          workspaceId: labels?.workspaceId,
          model: labels?.model,
          provider: labels?.provider,
        },
        'slow request detected',
      );
    }
  }

  getSummary(name: string, labels?: MetricLabels): LatencySummary {
    const hist = metricsService.getHistogram(METRIC_NAMES.LATENCY, labels);
    const slowCount = this.slowRequests.filter((r) => r.name === name).length;

    return {
      name,
      count: hist.count,
      avg: hist.avg,
      p50: hist.p50,
      p95: hist.p95,
      p99: hist.p99,
      slowCount,
    };
  }

  getSlowRequests(limit = 20): LatencyRecord[] {
    return this.slowRequests.slice(-limit);
  }

  reset(): void {
    this.slowRequests = [];
  }
}

export const latencyTrackerService = new LatencyTrackerService();
