import { tokenBudgetService } from '../../../src/modules/rag/services/token-budget.service';

describe('token-budget', () => {
  it('trims chunks to fit token budget', () => {
    const trimmed = tokenBudgetService.trimChunks(
      [
        {
          id: '1',
          content: 'short chunk one',
          sourceType: 'TRANSCRIPT',
          similarity: 1,
          metadata: {},
        },
        {
          id: '2',
          content: 'a'.repeat(400),
          sourceType: 'TRANSCRIPT',
          similarity: 0.9,
          metadata: {},
        },
      ],
      20,
    );

    expect(trimmed).toHaveLength(1);
    expect(trimmed[0].id).toBe('1');
  });

  it('keeps most recent history within budget', () => {
    const trimmed = tokenBudgetService.trimHistory(
      [
        { role: 'user', content: 'old question' },
        { role: 'assistant', content: 'old answer' },
        { role: 'user', content: 'new question' },
      ],
      20,
    );

    expect(trimmed.at(-1)?.content).toBe('new question');
  });
});
