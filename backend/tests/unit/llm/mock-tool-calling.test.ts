import { buildMockChatToolResponse } from '../../../src/modules/llm/fixtures/mock-responses';
import { MockLLMProvider } from '../../../src/modules/llm/providers/mock.provider';

describe('mock provider tool calling', () => {
  const provider = new MockLLMProvider();

  it('returns a tool call for task-related chat queries', async () => {
    const response = await provider.complete({
      workflow: 'chat',
      messages: [{ role: 'user', content: 'What tasks are assigned to Sarah?' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'SearchTasksTool',
            description: 'Search tasks',
            parameters: { type: 'object', properties: { query: { type: 'string' } } },
          },
        },
      ],
    });

    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls?.[0].name).toBe('SearchTasksTool');
    expect(response.finishReason).toBe('tool_calls');
  });

  it('returns final answer after tool result message', () => {
    const response = buildMockChatToolResponse({
      workflow: 'chat',
      messages: [
        { role: 'user', content: 'What tasks are pending?' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'call_1',
              name: 'SearchTasksTool',
              arguments: JSON.stringify({ query: 'pending' }),
            },
          ],
        },
        {
          role: 'tool',
          content: JSON.stringify({ success: true, data: [] }),
          toolCallId: 'call_1',
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'SearchTasksTool',
            description: 'Search tasks',
            parameters: { type: 'object', properties: { query: { type: 'string' } } },
          },
        },
      ],
    });

    expect(response.toolCalls).toBeUndefined();
    expect(response.content).toContain('workspace data');
  });
});
