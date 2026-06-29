export interface RetryPolicyConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableCodes: string[];
}

export const DEFAULT_OBS_RETRY_POLICY: RetryPolicyConfig = {
  maxRetries: 3,
  baseDelayMs: 2_000,
  maxDelayMs: 8_000,
  retryableCodes: ['RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'TIMEOUT', '429', '500', '502', '503'],
};

export interface RetryEvent {
  component: string;
  attempt: number;
  maxAttempts: number;
  provider?: string;
  workspaceId?: string;
  reason: string;
  success?: boolean;
  timestamp: string;
}
