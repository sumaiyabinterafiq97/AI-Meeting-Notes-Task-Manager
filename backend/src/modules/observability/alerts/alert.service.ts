import { randomUUID } from 'crypto';
import { cacheObservabilityService } from '../cache/cache-observability.service';
import { costReportService } from '../cost-tracking/cost-report.service';
import { latencyTrackerService } from '../latency/latency-tracker.service';
import { metricsService } from '../metrics/metrics.service';
import { rateLimitTrackerService } from '../rate-limit/rate-limit-tracker.service';
import { retryObservabilityService } from '../retry/retry-observability.service';
import { tokenUsageService } from '../token-monitoring/token-usage.service';
import { alertChannels } from './alert-channels';
import {
  DEFAULT_ALERT_THRESHOLDS,
  type Alert,
  type AlertSeverity,
  type AlertType,
} from './alert.types';

/**
 * Alert generation and delivery — cost, latency, failures, cache, provider outages.
 */
export class AlertService {
  private alerts: Alert[] = [];
  private readonly maxAlerts = 100;

  async evaluate(workspaceId?: string, thresholds = DEFAULT_ALERT_THRESHOLDS): Promise<Alert[]> {
    const generated: Alert[] = [];

    if (workspaceId) {
      const dailyCost = await costReportService.getWorkspaceDailyCost(workspaceId);
      if (dailyCost.totalCostUsd >= thresholds.dailyCostUsd) {
        generated.push(
          this.createAlert('high_cost', 'high', `Workspace daily cost $${dailyCost.totalCostUsd.toFixed(2)} exceeds threshold`, workspaceId, {
            cost: dailyCost.totalCostUsd,
          }),
        );
      }

      const tokens = await tokenUsageService.getWorkspaceDailyTotal(workspaceId);
      if (tokens >= thresholds.tokenDailyLimit) {
        generated.push(
          this.createAlert('excessive_tokens', 'high', `Workspace daily tokens ${tokens} approaching limit`, workspaceId, {
            tokens,
          }),
        );
      }
    }

    const cacheStats = cacheObservabilityService.getSnapshot();
    const cacheAlert = cacheObservabilityService.checkHitRateAlert(thresholds.cacheHitRateMin);
    if (cacheAlert) {
      generated.push(
        this.createAlert('low_cache_hit_ratio', 'medium', cacheAlert, workspaceId, {
          hitRate: cacheStats.hitRate,
        }),
      );
    }

    const hist = metricsService.getHistogram('latency.duration');
    if (hist.p95 >= thresholds.latencyP95Ms) {
      generated.push(
        this.createAlert('high_latency', 'high', `P95 latency ${hist.p95}ms exceeds ${thresholds.latencyP95Ms}ms`, workspaceId, {
          p95: hist.p95,
        }),
      );
    }

    const retryStats = retryObservabilityService.getStats();
    for (const provider of retryStats.providerOutages) {
      generated.push(
        this.createAlert('provider_outage', 'critical', `Provider ${provider} outage detected`, workspaceId, {
          provider,
        }),
      );
    }

    const rateStats = rateLimitTrackerService.getStats();
    if (rateStats.violations >= thresholds.rateLimitSpikeCount) {
      generated.push(
        this.createAlert('rate_limit_spike', 'medium', `${rateStats.violations} rate limit violations`, workspaceId),
      );
    }

    const slowRequests = latencyTrackerService.getSlowRequests();
    if (slowRequests.length > 5) {
      generated.push(
        this.createAlert('high_latency', 'medium', `${slowRequests.length} slow requests detected`, workspaceId),
      );
    }

    for (const alert of generated) {
      await this.dispatch(alert);
    }

    return generated;
  }

  private createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    workspaceId?: string,
    metadata?: Record<string, unknown>,
  ): Alert {
    const alert: Alert = {
      id: randomUUID(),
      type,
      severity,
      message,
      workspaceId,
      metadata,
      createdAt: new Date().toISOString(),
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    return alert;
  }

  async dispatch(alert: Alert): Promise<void> {
    await alertChannels.sendLog(alert);

    if (alert.severity === 'critical' || alert.severity === 'high') {
      const slackUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
      const emailTo = process.env.ALERT_EMAIL_TO;
      await Promise.all([
        alertChannels.sendSlack(alert, slackUrl),
        alertChannels.sendEmail(alert, emailTo),
      ]);
    }
  }

  getRecentAlerts(limit = 20): Alert[] {
    return this.alerts.slice(-limit);
  }

  reset(): void {
    this.alerts = [];
  }
}

export const alertService = new AlertService();
