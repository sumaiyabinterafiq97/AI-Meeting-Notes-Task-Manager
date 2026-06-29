import { cacheObservabilityService } from '../cache/cache-observability.service';
import { costReportService } from '../cost-tracking/cost-report.service';
import { latencyTrackerService } from '../latency/latency-tracker.service';
import { metricsService } from '../metrics/metrics.service';
import { rateLimitTrackerService } from '../rate-limit/rate-limit-tracker.service';
import { retryObservabilityService } from '../retry/retry-observability.service';

export interface DashboardSnapshot {
  collectedAt: string;
  tokens: {
    metricsAvailable: boolean;
  };
  cost: {
    leaderboard: Awaited<ReturnType<typeof costReportService.getCostLeaderboard>>;
  };
  latency: {
    slowRequests: ReturnType<typeof latencyTrackerService.getSlowRequests>;
  };
  failures: {
    retryStats: ReturnType<typeof retryObservabilityService.getStats>;
  };
  agents: {
    executionHistogram: ReturnType<typeof metricsService.getHistogram>;
  };
  cache: ReturnType<typeof cacheObservabilityService.getSnapshot>;
  providers: Record<string, number>;
  queue: {
    depth: number;
  };
  retries: ReturnType<typeof retryObservabilityService.getStats>;
  rateLimits: ReturnType<typeof rateLimitTrackerService.getStats>;
  rawMetrics: ReturnType<typeof metricsService.getSnapshot>;
}

/**
 * Dashboard metrics aggregator — single snapshot for ops/AI dashboards.
 */
export class DashboardMetricsService {
  private queueDepth = 0;

  setQueueDepth(depth: number): void {
    this.queueDepth = depth;
    metricsService.setGauge('bullmq.queue.depth', depth);
  }

  async getSnapshot(workspaceId?: string): Promise<DashboardSnapshot> {
    const [leaderboard] = await Promise.all([
      costReportService.getCostLeaderboard(10, 7),
    ]);

    const providers = workspaceId
      ? await costReportService.getCostByProvider(workspaceId, 7)
      : {};

    return {
      collectedAt: new Date().toISOString(),
      tokens: { metricsAvailable: true },
      cost: { leaderboard },
      latency: { slowRequests: latencyTrackerService.getSlowRequests() },
      failures: { retryStats: retryObservabilityService.getStats() },
      agents: {
        executionHistogram: metricsService.getHistogram('agent.execution.duration'),
      },
      cache: cacheObservabilityService.getSnapshot(),
      providers,
      queue: { depth: this.queueDepth },
      retries: retryObservabilityService.getStats(),
      rateLimits: rateLimitTrackerService.getStats(),
      rawMetrics: metricsService.getSnapshot(),
    };
  }
}

export const dashboardMetricsService = new DashboardMetricsService();
