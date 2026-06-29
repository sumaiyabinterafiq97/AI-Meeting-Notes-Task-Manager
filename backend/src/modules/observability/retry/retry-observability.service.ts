import { metricsService } from '../metrics/metrics.service';
import { structuredLogger } from '../logging/structured-logger';
import type { RetryEvent } from './retry-policy.types';

export interface RetryStats {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  byProvider: Record<string, number>;
  byReason: Record<string, number>;
  providerOutages: string[];
}

/**
 * Retry observability — tracks retry attempts, success rates, and provider outages.
 */
export class RetryObservabilityService {
  private events: RetryEvent[] = [];
  private readonly maxEvents = 500;
  private providerOutages = new Set<string>();

  recordRetry(event: Omit<RetryEvent, 'timestamp'>): void {
    const full: RetryEvent = { ...event, timestamp: new Date().toISOString() };
    this.events.push(full);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    metricsService.recordRetry({
      provider: event.provider,
      workspaceId: event.workspaceId,
    });

    structuredLogger.warn(
      {
        component: event.component,
        action: 'retry',
        attempt: event.attempt,
        maxAttempts: event.maxAttempts,
        provider: event.provider,
        workspaceId: event.workspaceId,
        reason: event.reason,
      },
      'retry attempt',
    );
  }

  recordProviderOutage(provider: string, reason: string): void {
    this.providerOutages.add(provider);
    metricsService.recordProviderOutage(provider);
    structuredLogger.error(
      { component: 'retry', provider, reason, action: 'provider.outage' },
      'provider outage detected',
    );
  }

  recordRetrySuccess(component: string, attempt: number, provider?: string): void {
    structuredLogger.info(
      { component, action: 'retry.success', attempt, provider },
      'retry succeeded',
    );
  }

  getStats(): RetryStats {
    const byProvider: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    let successfulRetries = 0;
    let failedRetries = 0;

    for (const event of this.events) {
      if (event.provider) {
        byProvider[event.provider] = (byProvider[event.provider] ?? 0) + 1;
      }
      byReason[event.reason] = (byReason[event.reason] ?? 0) + 1;
      if (event.success === true) successfulRetries += 1;
      if (event.success === false) failedRetries += 1;
    }

    return {
      totalRetries: this.events.length,
      successfulRetries,
      failedRetries,
      byProvider,
      byReason,
      providerOutages: [...this.providerOutages],
    };
  }

  reset(): void {
    this.events = [];
    this.providerOutages.clear();
  }
}

export const retryObservabilityService = new RetryObservabilityService();
