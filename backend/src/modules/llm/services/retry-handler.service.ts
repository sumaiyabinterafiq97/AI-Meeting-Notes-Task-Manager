import { isRetryableLLMError } from '../errors/llm.errors';
import { retryObservabilityService } from '../../observability/retry/retry-observability.service';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const baseDelayMs = options.baseDelayMs ?? 2000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableLLMError(error) && attempt < options.maxAttempts;
      if (!shouldRetry) {
        throw error;
      }
      retryObservabilityService.recordRetry({
        component: 'llm',
        attempt,
        maxAttempts: options.maxAttempts,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}
