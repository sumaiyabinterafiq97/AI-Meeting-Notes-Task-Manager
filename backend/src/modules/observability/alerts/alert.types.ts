export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AlertType =
  | 'high_cost'
  | 'high_latency'
  | 'high_failure_rate'
  | 'low_cache_hit_ratio'
  | 'provider_outage'
  | 'queue_failure'
  | 'rate_limit_spike'
  | 'excessive_tokens';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AlertThresholds {
  dailyCostUsd: number;
  latencyP95Ms: number;
  failureRatePercent: number;
  cacheHitRateMin: number;
  tokenDailyLimit: number;
  rateLimitSpikeCount: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  dailyCostUsd: 50,
  latencyP95Ms: 45_000,
  failureRatePercent: 10,
  cacheHitRateMin: 0.2,
  tokenDailyLimit: 400_000,
  rateLimitSpikeCount: 50,
};
