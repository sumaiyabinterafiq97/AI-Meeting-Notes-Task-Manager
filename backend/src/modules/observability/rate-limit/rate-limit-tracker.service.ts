import { metricsService } from '../metrics/metrics.service';
import { structuredLogger } from '../logging/structured-logger';

export type RateLimitScope = 'user' | 'workspace' | 'provider' | 'token' | 'burst';

export interface RateLimitViolation {
  scope: RateLimitScope;
  identifier: string;
  endpoint?: string;
  limit: number;
  current: number;
  timestamp: string;
}

export interface RateLimitStats {
  violations: number;
  blockedRequests: number;
  byScope: Record<RateLimitScope, number>;
  recentViolations: RateLimitViolation[];
}

/**
 * Rate limit observability — violations, blocked requests, abuse patterns.
 */
export class RateLimitTrackerService {
  private violations: RateLimitViolation[] = [];
  private blockedRequests = 0;
  private readonly maxViolations = 200;

  recordViolation(violation: Omit<RateLimitViolation, 'timestamp'>): void {
    const full: RateLimitViolation = { ...violation, timestamp: new Date().toISOString() };
    this.violations.push(full);
    this.blockedRequests += 1;

    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }

    metricsService.recordRateLimitViolation({
      userId: violation.scope === 'user' ? violation.identifier : undefined,
      workspaceId: violation.scope === 'workspace' ? violation.identifier : undefined,
      provider: violation.scope === 'provider' ? violation.identifier : undefined,
    });

    structuredLogger.warn(
      {
        component: 'rate-limit',
        scope: violation.scope,
        identifier: violation.identifier,
        endpoint: violation.endpoint,
        limit: violation.limit,
        current: violation.current,
      },
      'rate limit violation',
    );
  }

  getStats(): RateLimitStats {
    const byScope: Record<RateLimitScope, number> = {
      user: 0,
      workspace: 0,
      provider: 0,
      token: 0,
      burst: 0,
    };

    for (const v of this.violations) {
      byScope[v.scope] += 1;
    }

    return {
      violations: this.violations.length,
      blockedRequests: this.blockedRequests,
      byScope,
      recentViolations: this.violations.slice(-20),
    };
  }

  detectAbusePattern(threshold = 10, windowMinutes = 60): string[] {
    const since = Date.now() - windowMinutes * 60_000;
    const counts = new Map<string, number>();

    for (const v of this.violations) {
      if (new Date(v.timestamp).getTime() < since) continue;
      const key = `${v.scope}:${v.identifier}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .filter(([, count]) => count >= threshold)
      .map(([key, count]) => `${key} (${count} violations in ${windowMinutes}m)`);
  }

  reset(): void {
    this.violations = [];
    this.blockedRequests = 0;
  }
}

export const rateLimitTrackerService = new RateLimitTrackerService();
