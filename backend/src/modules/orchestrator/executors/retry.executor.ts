export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableCodes: string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 2_000,
  maxDelayMs: 8_000,
  retryableCodes: [
    'RATE_LIMITED',
    'PROVIDER_UNAVAILABLE',
    'TIMEOUT',
    'AGENT_EXECUTION_FAILED',
    '429',
    '500',
    '502',
    '503',
  ],
};

export function isRetryableError(error: unknown, policy: RetryPolicy = DEFAULT_RETRY_POLICY): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes('timeout') || message.includes('429') || message.includes('503')) {
    return true;
  }
  return policy.retryableCodes.some((code) => message.includes(code.toLowerCase()));
}

export function computeBackoffDelay(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const delay = policy.baseDelayMs * 2 ** attempt;
  return Math.min(delay, policy.maxDelayMs);
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= policy.maxRetries || !isRetryableError(error, policy)) {
        throw error;
      }
      onRetry?.(attempt + 1, error);
      await sleep(computeBackoffDelay(attempt, policy));
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
