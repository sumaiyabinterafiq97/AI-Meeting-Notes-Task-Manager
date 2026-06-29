import { llmService } from '../../../src/modules/llm';
import { env } from '../../../src/config/env';
import { memorySummarizerService } from '../../../src/modules/agents/memory/memory-summarizer.service';

describe('memory summarizer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses deterministic summary when LLM summary is disabled', async () => {
    const previous = env.CHAT_MEMORY_LLM_SUMMARY;
    (env as { CHAT_MEMORY_LLM_SUMMARY: boolean }).CHAT_MEMORY_LLM_SUMMARY = false;

    try {
      const summary = await memorySummarizerService.summarizeHistory({
        messages: [
          { role: 'user', content: 'What decisions did we make about OAuth?' },
          { role: 'assistant', content: 'The team chose OAuth 2.0 with PKCE.' },
        ],
        existingSummary: 'Earlier: discussed authentication.',
      });

      expect(summary).toContain('OAuth');
      expect(summary).toContain('Earlier: discussed authentication.');
    } finally {
      (env as { CHAT_MEMORY_LLM_SUMMARY: boolean }).CHAT_MEMORY_LLM_SUMMARY = previous;
    }
  });

  it('calls LLM summarizer when enabled and not in mock mode', async () => {
    const previousSummary = env.CHAT_MEMORY_LLM_SUMMARY;
    const previousMock = env.AI_USE_MOCK;
    (env as { CHAT_MEMORY_LLM_SUMMARY: boolean }).CHAT_MEMORY_LLM_SUMMARY = true;
    (env as { AI_USE_MOCK: boolean }).AI_USE_MOCK = false;

    const completeSpy = jest.spyOn(llmService, 'complete').mockResolvedValue({
      content: 'User asked about OAuth; assistant confirmed PKCE was selected.',
      model: 'mock',
      provider: 'mock',
      promptTokens: 50,
      completionTokens: 20,
      finishReason: 'stop',
    });

    try {
      const summary = await memorySummarizerService.summarizeHistory({
        messages: [
          { role: 'user', content: 'What decisions did we make about OAuth?' },
          { role: 'assistant', content: 'The team chose OAuth 2.0 with PKCE.' },
        ],
      });

      expect(completeSpy).toHaveBeenCalled();
      expect(summary).toContain('PKCE');
    } finally {
      (env as { CHAT_MEMORY_LLM_SUMMARY: boolean }).CHAT_MEMORY_LLM_SUMMARY = previousSummary;
      (env as { AI_USE_MOCK: boolean }).AI_USE_MOCK = previousMock;
    }
  });
});
