import { llmService } from '../../../src/modules/llm';
import { ChatResponseSchema } from '../../../src/modules/agents/schemas/zod-schemas';
import * as structuredOutput from '../../../src/modules/agents/schemas/structured-output.service';
import {
  toolCallingLoopService,
  toolExecutorService,
} from '../../../src/modules/agents/tools';

describe('tool calling loop', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes tool calls and returns final assistant content', async () => {
    const completeSpy = jest
      .spyOn(llmService, 'complete')
      .mockResolvedValueOnce({
        content: '',
        model: 'mock',
        provider: 'mock',
        promptTokens: 100,
        completionTokens: 0,
        finishReason: 'tool_calls',
        toolCalls: [
          {
            id: 'call_1',
            name: 'SearchTasksTool',
            arguments: JSON.stringify({ query: 'pending', limit: 3 }),
          },
        ],
      })
      .mockResolvedValueOnce({
        content: 'There are 2 pending tasks assigned to Sarah.',
        model: 'mock',
        provider: 'mock',
        promptTokens: 120,
        completionTokens: 20,
        finishReason: 'stop',
      });

    jest.spyOn(toolExecutorService, 'execute').mockResolvedValue({
      toolName: 'SearchTasksTool',
      success: true,
      data: [{ id: 'task-1', title: 'API migration' }],
      latencyMs: 5,
    });

    const result = await toolCallingLoopService.run({
      messages: [{ role: 'user', content: 'What tasks are pending?' }],
      toolContext: { workspaceId: '00000000-0000-0000-0000-000000000001' },
      workspaceId: '00000000-0000-0000-0000-000000000001',
      correlationId: 'corr-tools',
    });

    expect(completeSpy).toHaveBeenCalledTimes(2);
    expect(result.content).toContain('pending tasks');
    expect(result.toolCallsExecuted).toHaveLength(1);
    expect(result.toolCallsExecuted[0].success).toBe(true);
    expect(result.iterations).toBe(2);
  });

  it('returns immediately when model responds without tool calls', async () => {
    jest.spyOn(llmService, 'complete').mockResolvedValue({
      content: 'Direct answer without tools.',
      model: 'mock',
      provider: 'mock',
      promptTokens: 50,
      completionTokens: 10,
      finishReason: 'stop',
    });

    const result = await toolCallingLoopService.run({
      messages: [{ role: 'user', content: 'Hello' }],
      toolContext: { workspaceId: '00000000-0000-0000-0000-000000000001' },
      workspaceId: '00000000-0000-0000-0000-000000000001',
      correlationId: 'corr-direct',
    });

    expect(result.iterations).toBe(1);
    expect(result.toolCallsExecuted).toHaveLength(0);
    expect(result.content).toBe('Direct answer without tools.');
  });

  it('synthesizes structured final output when configured', async () => {
    jest.spyOn(llmService, 'complete').mockResolvedValue({
      content: 'Draft free-text answer.',
      model: 'mock',
      provider: 'mock',
      promptTokens: 50,
      completionTokens: 10,
      finishReason: 'stop',
    });

    const structuredSpy = jest.spyOn(structuredOutput, 'completeStructured').mockResolvedValue({
      response: {
        content: JSON.stringify({
          content: 'Structured answer with citations.',
          citations: [],
          grounded: true,
          refusalReason: null,
        }),
        model: 'mock',
        provider: 'mock',
        promptTokens: 60,
        completionTokens: 15,
        finishReason: 'stop',
      },
      parsed: {
        content: 'Structured answer with citations.',
        citations: [],
        grounded: true,
        refusalReason: null,
      },
    });

    const result = await toolCallingLoopService.run({
      messages: [{ role: 'user', content: 'What tasks are pending?' }],
      toolContext: { workspaceId: '00000000-0000-0000-0000-000000000001' },
      workspaceId: '00000000-0000-0000-0000-000000000001',
      correlationId: 'corr-structured-final',
      structuredFinalOutput: { zodSchema: ChatResponseSchema },
    });

    expect(structuredSpy).toHaveBeenCalledTimes(1);
    expect(result.content).toBe('Structured answer with citations.');
    expect(result.structuredParsed?.grounded).toBe(true);
    expect(result.promptTokens).toBe(110);
  });

  it('uses structured final output after executing tool calls', async () => {
    jest
      .spyOn(llmService, 'complete')
      .mockResolvedValueOnce({
        content: '',
        model: 'mock',
        provider: 'mock',
        promptTokens: 100,
        completionTokens: 0,
        finishReason: 'tool_calls',
        toolCalls: [
          {
            id: 'call_1',
            name: 'SearchTasksTool',
            arguments: JSON.stringify({ query: 'pending', limit: 3 }),
          },
        ],
      })
      .mockResolvedValueOnce({
        content: 'Draft after tools.',
        model: 'mock',
        provider: 'mock',
        promptTokens: 120,
        completionTokens: 20,
        finishReason: 'stop',
      });

    jest.spyOn(toolExecutorService, 'execute').mockResolvedValue({
      toolName: 'SearchTasksTool',
      success: true,
      data: [{ id: 'task-1', title: 'API migration' }],
      latencyMs: 5,
    });

    jest.spyOn(structuredOutput, 'completeStructured').mockResolvedValue({
      response: {
        content: '{}',
        model: 'mock',
        provider: 'mock',
        promptTokens: 80,
        completionTokens: 25,
        finishReason: 'stop',
      },
      parsed: {
        content: 'Sarah has 2 pending tasks from tool results.',
        citations: [],
        grounded: true,
        refusalReason: null,
      },
    });

    const result = await toolCallingLoopService.run({
      messages: [{ role: 'user', content: 'What tasks are pending?' }],
      toolContext: { workspaceId: '00000000-0000-0000-0000-000000000001' },
      workspaceId: '00000000-0000-0000-0000-000000000001',
      correlationId: 'corr-tools-structured',
      structuredFinalOutput: { zodSchema: ChatResponseSchema },
    });

    expect(result.toolCallsExecuted).toHaveLength(1);
    expect(result.content).toBe('Sarah has 2 pending tasks from tool results.');
    expect(result.structuredParsed).toBeDefined();
  });
});
