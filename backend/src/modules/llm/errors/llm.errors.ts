export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class LLMValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMValidationError';
  }
}

export class LLMTokenBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMTokenBudgetError';
  }
}

export function isRetryableLLMError(error: unknown): boolean {
  if (error instanceof LLMProviderError) {
    return error.retryable;
  }
  const status = (error as { status?: number })?.status;
  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }
  return false;
}
