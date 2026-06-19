import { withRetry } from '../../../src/modules/llm/services/retry-handler.service';
import { LLMProviderError } from '../../../src/modules/llm/errors/llm.errors';

describe('withRetry', () => {
  it('retries retryable errors then succeeds', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new LLMProviderError('rate limited', 'openai', 429, true);
        }
        return 'ok';
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new LLMProviderError('bad request', 'openai', 400, false);
        },
        { maxAttempts: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('bad request');

    expect(attempts).toBe(1);
  });
});
