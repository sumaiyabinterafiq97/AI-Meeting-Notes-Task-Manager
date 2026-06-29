import { ragService } from '../../../../src/modules/rag/services/rag.service';
import { agentExecutionService } from '../../../../src/modules/agents/services/agent-execution.service';
import { llmService } from '../../../../src/modules/llm';
import {
  chatAgent,
} from '../../../../src/modules/agents/chat/services/chat-agent.service';
import { EMPTY_CONTEXT_RESPONSE } from '../../../../src/modules/agents/chat/services/chat-agent.constants';
import * as structuredOutput from '../../../../src/modules/agents/schemas/structured-output.service';
import * as toolCalling from '../../../../src/modules/agents/tools/tool-calling-loop.service';
import { mockRagContext } from '../../../helpers/rag-context';

describe('chat-agent service', () => {
  beforeEach(() => {
    jest.spyOn(agentExecutionService, 'start').mockResolvedValue({ id: 'exec-1' } as never);
    jest.spyOn(agentExecutionService, 'complete').mockResolvedValue(undefined as never);
    jest.spyOn(agentExecutionService, 'fail').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty-context refusal without LLM call', async () => {
    jest.spyOn(ragService, 'prepareChatPrompt').mockResolvedValue({
      context: mockRagContext(),
      prompt: {
        messages: [{ role: 'system', content: 'system' }],
        totalTokens: 10,
        promptId: 'chat-agent',
        promptVersion: '2.1.0',
      },
      retrieval: { chunks: [], cacheHit: false, latencyMs: 1 },
    });

    const llmSpy = jest.spyOn(llmService, 'complete');

    const result = await chatAgent.runTurn(
      {
        userMessage: 'What decisions did we make?',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        chatHistory: [],
      },
      'corr-empty',
    );

    expect(result.content).toBe(EMPTY_CONTEXT_RESPONSE);
    expect(result.grounded).toBe(false);
    expect(result.refusalReason).toBe('empty_context');
    expect(result.model).toBe('none');
    expect(llmSpy).not.toHaveBeenCalled();
  });

  it('enriches grounded LLM responses with citations', async () => {
    jest.spyOn(ragService, 'prepareChatPrompt').mockResolvedValue({
      context: mockRagContext({
        blocks: [
          {
            citationIndex: 1,
            chunkId: 'chunk-1',
            content: 'OAuth 2.0 with PKCE was selected.',
            meetingId: '00000000-0000-0000-0000-000000000002',
            meetingTitle: 'Auth Planning',
            metadata: {},
          },
        ],
        totalTokens: 20,
      }),
      prompt: {
        messages: [{ role: 'system', content: 'system' }],
        totalTokens: 30,
        promptId: 'chat-agent',
        promptVersion: '2.1.0',
      },
      retrieval: { chunks: [], cacheHit: false, latencyMs: 1 },
    });

    jest.spyOn(llmService, 'complete').mockResolvedValue({
      content: 'The team selected OAuth 2.0 with PKCE [CITATION-1].',
      promptTokens: 100,
      completionTokens: 20,
      model: 'mock',
      provider: 'mock',
    } as never);

    const result = await chatAgent.runTurn(
      {
        userMessage: 'What auth approach did we choose?',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        chatHistory: [],
        workspaceName: 'Acme',
      },
      'corr-grounded',
    );

    expect(result.grounded).toBe(true);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].chunkId).toBe('chunk-1');
    expect(result.provider).toBe('mock');
  });

  it('uses structured output when v2.1 schema mode is enabled', async () => {
    jest.spyOn(structuredOutput, 'shouldUseStructuredChatOutput').mockReturnValue(true);
    jest.spyOn(structuredOutput, 'completeStructured').mockResolvedValue({
      response: {
        content: JSON.stringify({
          content: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
          citations: [{ index: 1, chunkId: 'chunk-1', claimText: 'OAuth selected' }],
          grounded: true,
          refusalReason: null,
        }),
        model: 'mock',
        provider: 'mock',
        promptTokens: 80,
        completionTokens: 20,
        finishReason: 'stop',
      },
      parsed: {
        content: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
        citations: [{ index: 1, chunkId: 'chunk-1', claimText: 'OAuth selected' }],
        grounded: true,
        refusalReason: null,
      },
    });

    jest.spyOn(ragService, 'prepareChatPrompt').mockResolvedValue({
      context: mockRagContext({
        blocks: [
          {
            citationIndex: 1,
            chunkId: 'chunk-1',
            content: 'OAuth 2.0 with PKCE was selected.',
            meetingId: '00000000-0000-0000-0000-000000000002',
            meetingTitle: 'Auth Planning',
            metadata: {},
          },
        ],
        totalTokens: 20,
      }),
      prompt: {
        messages: [{ role: 'system', content: 'system' }],
        totalTokens: 30,
        promptId: 'chat-agent',
        promptVersion: '2.1.0',
      },
      retrieval: { chunks: [], cacheHit: false, latencyMs: 1 },
    });

    const llmSpy = jest.spyOn(llmService, 'complete');

    const result = await chatAgent.runTurn(
      {
        userMessage: 'What auth approach did we choose?',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        chatHistory: [],
      },
      'corr-structured',
    );

    expect(structuredOutput.completeStructured).toHaveBeenCalled();
    expect(llmSpy).not.toHaveBeenCalled();
    expect(result.grounded).toBe(true);
    expect(result.citations[0].claimText).toBe('OAuth selected');
  });

  it('uses unified mode when structured output and tools are both enabled', async () => {
    jest.spyOn(structuredOutput, 'shouldUseUnifiedChatMode').mockReturnValue(true);
    jest.spyOn(structuredOutput, 'shouldUseStructuredChatOutput').mockReturnValue(true);

    jest.spyOn(ragService, 'prepareChatPrompt').mockResolvedValue({
      context: mockRagContext({
        blocks: [
          {
            citationIndex: 1,
            chunkId: 'chunk-1',
            content: 'Sarah owns the API migration task.',
            meetingId: '00000000-0000-0000-0000-000000000002',
            meetingTitle: 'Sprint Planning',
            metadata: {},
          },
        ],
        totalTokens: 20,
      }),
      prompt: {
        messages: [{ role: 'system', content: 'system' }],
        totalTokens: 30,
        promptId: 'chat-agent',
        promptVersion: '2.1.0',
      },
      retrieval: { chunks: [], cacheHit: false, latencyMs: 1 },
    });

    jest.spyOn(toolCalling.toolCallingLoopService, 'run').mockResolvedValue({
      content: 'Sarah has 2 pending tasks [CITATION-1].',
      promptTokens: 180,
      completionTokens: 40,
      model: 'mock',
      provider: 'mock',
      toolCallsExecuted: [{ toolName: 'SearchTasksTool', success: true, data: [], latencyMs: 1 }],
      iterations: 2,
      structuredParsed: {
        content: 'Sarah has 2 pending tasks [CITATION-1].',
        citations: [{ index: 1, chunkId: 'chunk-1', claimText: 'Sarah pending tasks' }],
        grounded: true,
        refusalReason: null,
      },
    });

    const llmSpy = jest.spyOn(llmService, 'complete');
    const structuredSpy = jest.spyOn(structuredOutput, 'completeStructured');

    const result = await chatAgent.runTurn(
      {
        userMessage: 'What tasks are assigned to Sarah?',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        chatHistory: [],
      },
      'corr-unified',
    );

    expect(toolCalling.toolCallingLoopService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        structuredFinalOutput: expect.objectContaining({ zodSchema: expect.anything() }),
      }),
    );
    expect(structuredSpy).not.toHaveBeenCalled();
    expect(llmSpy).not.toHaveBeenCalled();
    expect(result.grounded).toBe(true);
    expect(result.citations[0].claimText).toBe('Sarah pending tasks');
  });
});
