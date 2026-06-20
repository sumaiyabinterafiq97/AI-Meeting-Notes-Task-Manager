import { resolveContextTokenBudget, RAG_TOKEN_BUDGETS } from '../../../src/modules/rag/services/token-budget.service';

describe('token budget service', () => {
  it('resolves per-use-case context budgets', () => {
    expect(resolveContextTokenBudget('chat')).toBe(RAG_TOKEN_BUDGETS.retrievedContext);
    expect(resolveContextTokenBudget('meeting')).toBe(RAG_TOKEN_BUDGETS.retrievedContextMeeting);
    expect(resolveContextTokenBudget('weekly')).toBe(RAG_TOKEN_BUDGETS.retrievedContextWeekly);
    expect(resolveContextTokenBudget()).toBe(RAG_TOKEN_BUDGETS.retrievedContext);
  });
});
