import { isRetryableLLMError } from '../errors/llm.errors';

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
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}
