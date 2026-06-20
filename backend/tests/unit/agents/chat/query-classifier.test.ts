import { classifyQueryByRules, queryClassifierService } from '../../../../src/modules/agents/chat/services/query-classifier.service';
import { env } from '../../../../src/config/env';
import { llmService } from '../../../../src/modules/llm';

describe('query classifier', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('classifies task queries by rules', () => {
    const result = classifyQueryByRules('What tasks are assigned to Sarah?');
    expect(result.intent).toBe('task_query');
    expect(result.retrievalHints.sourceTypes).toEqual(['action_item']);
    expect(result.method).toBe('rules');
  });

  it('classifies comparison queries by rules', () => {
    const result = classifyQueryByRules('Did we change the launch date?');
    expect(result.intent).toBe('comparison');
    expect(result.retrievalHints.topK).toBe(12);
  });

  it('classifies synthesis queries by rules', () => {
    const result = classifyQueryByRules('Summarize our last sprint planning meeting');
    expect(result.intent).toBe('synthesis');
  });

  it('defaults ambiguous queries to general', () => {
    const result = classifyQueryByRules('Hello there');
    expect(result.intent).toBe('general');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('maps classification to RAG query hints', () => {
    const classification = classifyQueryByRules('Show risks for Project Alpha');
    const ragQuery = queryClassifierService.applyToRagQuery(
      {
        query: 'Show risks for Project Alpha',
        workspaceId: '00000000-0000-0000-0000-000000000001',
      },
      classification,
    );

    expect(ragQuery.sourceTypes).toEqual(['decision', 'summary', 'action_item']);
    expect(classification.intent).toBe('factual_lookup');
  });

  it('uses LLM refinement for general queries when enabled', async () => {
    jest.spyOn(llmService, 'complete').mockResolvedValue({
      content: JSON.stringify({ intent: 'task_query', confidence: 0.91 }),
      model: 'mock',
      provider: 'mock',
      promptTokens: 20,
      completionTokens: 10,
      finishReason: 'stop',
    });

    const previous = env.CHAT_QUERY_CLASSIFIER_LLM;
    (env as { CHAT_QUERY_CLASSIFIER_LLM: boolean }).CHAT_QUERY_CLASSIFIER_LLM = true;

    try {
      const result = await queryClassifierService.classify('Can you help?', {
        workspaceId: '00000000-0000-0000-0000-000000000001',
      });
      expect(result.intent).toBe('task_query');
      expect(result.method).toBe('llm');
    } finally {
      (env as { CHAT_QUERY_CLASSIFIER_LLM: boolean }).CHAT_QUERY_CLASSIFIER_LLM = previous;
    }
  });
});
