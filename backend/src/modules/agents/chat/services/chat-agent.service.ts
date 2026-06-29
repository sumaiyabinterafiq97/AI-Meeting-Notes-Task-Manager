import { randomUUID } from 'crypto';
import { env } from '../../../../config/env';
import { llmService } from '../../../llm';
import { streamBufferedText, throwIfAborted } from '../../../llm/services/streaming.service';
import { validateWithZod } from '../../../llm/services/zod-validator.service';
import { ragService } from '../../../rag';
import { conversationMemoryService } from '../../memory';
import { inputSanitizerService } from '../../security';
import { toolCallingLoopService } from '../../tools';
import { ChatResponseSchema } from '../../schemas/zod-schemas';
import { agentExecutionService } from '../../services/agent-execution.service';
import { createAgentMessage } from '../../services/agent-runner.service';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { ChatAgentInput, ChatAgentOutput } from '../types/chat-agent.types';
import type { ContextBlock } from '../../../rag/types/rag.types';
import {
  enrichChatOutput,
  enrichStructuredChatOutput,
  mapChatCitations,
} from './chat-agent.validator';
import {
  completeStructured,
  shouldUseStructuredChatOutput,
  shouldUseUnifiedChatMode,
} from '../../schemas/structured-output.service';
import {
  EMPTY_CONTEXT_RESPONSE,
  FALLBACK_CHAT_RESPONSE,
  INJECTION_REFUSAL_RESPONSE,
} from './chat-agent.constants';
import { queryClassifierService } from './query-classifier.service';

export interface ChatTurnPackage {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  contextBlocks: ContextBlock[];
  promptTokens: number;
  injectionDetected: boolean;
  emptyContext: boolean;
  historyCompressed: number;
  rollingSummaryUsed: boolean;
  promptVersion: string;
  queryIntent?: string;
  queryIntentConfidence?: number;
}

export interface ChatTurnResult {
  content: string;
  citations: Array<{
    index: number;
    chunkId: string;
    excerpt: string;
    meetingId?: string;
    meetingTitle?: string;
    claimText?: string;
  }>;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
  grounded: boolean;
  refusalReason: string | null;
  injectionDetected: boolean;
}

function buildShortCircuitResult(
  content: string,
  turn: ChatTurnPackage,
  options: { grounded: boolean; refusalReason: string | null },
): ChatTurnResult {
  return {
    content,
    citations: [],
    promptTokens: turn.promptTokens,
    completionTokens: Math.ceil(content.length / 4),
    model: 'none',
    provider: 'none',
    grounded: options.grounded,
    refusalReason: options.refusalReason,
    injectionDetected: turn.injectionDetected,
  };
}

export interface ChatStreamTurnOptions {
  signal?: AbortSignal;
}

type ChatEnrichedResult = Pick<
  ChatTurnResult,
  'content' | 'citations' | 'grounded' | 'refusalReason' | 'injectionDetected'
>;

function buildToolLoopInput(
  turn: ChatTurnPackage,
  input: ChatAgentInput,
  correlationId: string,
  options: { signal?: AbortSignal; structuredFinalOutput?: boolean },
) {
  return {
    messages: turn.messages,
    toolContext: {
      workspaceId: input.workspaceId,
      meetingId: input.meetingId,
      correlationId,
    },
    workspaceId: input.workspaceId,
    correlationId,
    promptVersion: turn.promptVersion,
    signal: options.signal,
    structuredFinalOutput: options.structuredFinalOutput
      ? { zodSchema: ChatResponseSchema }
      : undefined,
  };
}

function enrichFromStructured(
  parsed: Parameters<typeof enrichStructuredChatOutput>[0]['parsed'],
  turn: ChatTurnPackage,
): ChatEnrichedResult {
  return enrichStructuredChatOutput({
    parsed,
    contextBlocks: turn.contextBlocks,
    emptyContext: turn.emptyContext,
    injectionDetected: turn.injectionDetected,
  });
}

function enrichFromText(content: string, turn: ChatTurnPackage): ChatEnrichedResult {
  return enrichChatOutput({
    content,
    contextBlocks: turn.contextBlocks,
    emptyContext: turn.emptyContext,
    injectionDetected: turn.injectionDetected,
  });
}

export class ChatAgentService implements IAgent<ChatAgentInput, ChatAgentOutput> {
  readonly type = 'chat' as const;

  async prepareTurn(input: ChatAgentInput, _correlationId: string): Promise<ChatTurnPackage> {
    const { text: sanitizedMessage, injectionDetected } = inputSanitizerService.sanitizeUserMessage(
      input.userMessage,
    );

    const memoryContext = await conversationMemoryService.prepareContext({
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      messageCount: input.messageCount,
      history: input.chatHistory.map((message) => ({
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content,
      })),
    });

    const classification = await queryClassifierService.classify(sanitizedMessage, {
      workspaceId: input.workspaceId,
      correlationId: _correlationId,
    });

    const ragQuery = queryClassifierService.applyToRagQuery(
      {
        query: sanitizedMessage,
        workspaceId: input.workspaceId,
        meetingId: input.meetingId,
        mode: 'hybrid',
        topK: input.meetingId ? 8 : 10,
        queryIntent: classification.intent,
      },
      classification,
    );

    const pipeline = await ragService.prepareChatPrompt(
      ragQuery,
      memoryContext.messages,
      {
        variables: {
          workspaceName: input.workspaceName ?? 'Workspace',
          scope: input.meetingId ? 'meeting' : 'workspace',
          queryIntent: classification.intent,
        },
      },
    );

    const emptyContext = pipeline.context.blocks.length === 0;

    return {
      messages: pipeline.prompt.messages,
      contextBlocks: pipeline.context.blocks,
      promptTokens: pipeline.prompt.totalTokens,
      injectionDetected,
      emptyContext,
      historyCompressed: memoryContext.droppedCount,
      rollingSummaryUsed: memoryContext.rollingSummaryUsed,
      promptVersion: pipeline.prompt.promptVersion,
      queryIntent: classification.intent,
      queryIntentConfidence: classification.confidence,
    };
  }

  private resolveShortCircuit(turn: ChatTurnPackage): ChatTurnResult | null {
    if (turn.injectionDetected && turn.emptyContext) {
      return buildShortCircuitResult(INJECTION_REFUSAL_RESPONSE, turn, {
        grounded: false,
        refusalReason: 'prompt_injection',
      });
    }

    if (turn.emptyContext) {
      return buildShortCircuitResult(EMPTY_CONTEXT_RESPONSE, turn, {
        grounded: false,
        refusalReason: 'empty_context',
      });
    }

    return null;
  }

  async runTurn(input: ChatAgentInput, correlationId: string): Promise<ChatTurnResult> {
    const turn = await this.prepareTurn(input, correlationId);
    const shortCircuit = this.resolveShortCircuit(turn);

    if (shortCircuit) {
      return shortCircuit;
    }

    const execution = await agentExecutionService.start({
      workspaceId: input.workspaceId,
      meetingId: input.meetingId,
      correlationId,
      agentType: this.type,
    });

    try {
      const useUnified = shouldUseUnifiedChatMode();
      const useStructuredOnly = shouldUseStructuredChatOutput() && !env.CHAT_TOOLS_ENABLED;
      const useToolsOnly = env.CHAT_TOOLS_ENABLED && !shouldUseStructuredChatOutput();

      const llmResult = useUnified
        ? await toolCallingLoopService
            .run(buildToolLoopInput(turn, input, correlationId, { structuredFinalOutput: true }))
            .then((loopResult) => {
              const enriched = loopResult.structuredParsed
                ? enrichFromStructured(loopResult.structuredParsed, turn)
                : enrichFromText(loopResult.content, turn);
              return {
                ...enriched,
                promptTokens: loopResult.promptTokens,
                completionTokens: loopResult.completionTokens,
                model: loopResult.model,
                provider: loopResult.provider,
              };
            })
        : useStructuredOnly
        ? await completeStructured('chat', {
            workflow: 'chat',
            messages: turn.messages,
            workspaceId: input.workspaceId,
            correlationId,
          }, {
            promptId: 'chat-agent',
            promptVersion: turn.promptVersion,
            zodSchema: ChatResponseSchema,
          }).then(({ response, parsed }) => {
            const enriched = enrichFromStructured(parsed, turn);
            return {
              ...enriched,
              promptTokens: response.promptTokens,
              completionTokens: response.completionTokens,
              model: response.model,
              provider: response.provider,
            };
          })
        : useToolsOnly
        ? await toolCallingLoopService
            .run(buildToolLoopInput(turn, input, correlationId, {}))
            .then((loopResult) => {
              const enriched = enrichFromText(loopResult.content, turn);
              return {
                ...enriched,
                promptTokens: loopResult.promptTokens,
                completionTokens: loopResult.completionTokens,
                model: loopResult.model,
                provider: loopResult.provider,
              };
            })
        : await llmService.complete(
            {
              workflow: 'chat',
              messages: turn.messages,
              workspaceId: input.workspaceId,
              correlationId,
            },
            { promptId: 'chat-agent', promptVersion: turn.promptVersion },
          ).then((response) => {
            const enriched = enrichFromText(response.content, turn);
            return {
              ...enriched,
              promptTokens: response.promptTokens,
              completionTokens: response.completionTokens,
              model: response.model,
              provider: response.provider,
            };
          });

      await agentExecutionService.complete(execution.id, {
        inputTokens: llmResult.promptTokens,
        outputTokens: llmResult.completionTokens,
        latencyMs: 0,
        model: llmResult.model,
        provider: llmResult.provider,
      });

      return {
        content: llmResult.content,
        citations: llmResult.citations,
        promptTokens: llmResult.promptTokens,
        completionTokens: llmResult.completionTokens,
        model: llmResult.model,
        provider: llmResult.provider,
        grounded: llmResult.grounded,
        refusalReason: llmResult.refusalReason,
        injectionDetected: turn.injectionDetected,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat turn failed';
      await agentExecutionService.fail(execution.id, message);

      return {
        content: FALLBACK_CHAT_RESPONSE,
        citations: [],
        promptTokens: turn.promptTokens,
        completionTokens: Math.ceil(FALLBACK_CHAT_RESPONSE.length / 4),
        model: 'none',
        provider: 'none',
        grounded: false,
        refusalReason: 'generation_failed',
        injectionDetected: turn.injectionDetected,
      };
    }
  }

  async execute(
    message: AgentMessage<ChatAgentInput, ChatAgentOutput>,
  ): Promise<AgentMessage<ChatAgentInput, ChatAgentOutput>> {
    const startedAt = Date.now();
    const result = await this.runTurn(message.input, message.correlationId);

    return {
      ...message,
      output: {
        content: result.content,
        citations: result.citations.map((citation) => ({
          index: citation.index,
          chunkId: citation.chunkId,
          excerpt: citation.excerpt,
          meetingId: citation.meetingId,
          meetingTitle: citation.meetingTitle,
          claimText: citation.claimText,
        })),
        grounded: result.grounded,
        refusalReason: result.refusalReason,
        injectionDetected: result.injectionDetected,
      },
      status: 'completed',
      metrics: {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
        provider: result.provider,
      },
    };
  }

  async *streamTurn(
    input: ChatAgentInput,
    correlationId: string,
    options: ChatStreamTurnOptions = {},
  ): AsyncGenerator<
    | { type: 'token'; content: string }
    | {
        type: 'done';
        content: string;
        promptTokens: number;
        completionTokens: number;
        contextBlocks: ContextBlock[];
        citations: ChatTurnResult['citations'];
        grounded: boolean;
        refusalReason: string | null;
        injectionDetected: boolean;
      }
  > {
    const turn = await this.prepareTurn(input, correlationId);
    const shortCircuit = this.resolveShortCircuit(turn);

    if (shortCircuit) {
      yield { type: 'token', content: shortCircuit.content };
      yield {
        type: 'done',
        content: shortCircuit.content,
        promptTokens: shortCircuit.promptTokens,
        completionTokens: shortCircuit.completionTokens,
        contextBlocks: [],
        citations: shortCircuit.citations,
        grounded: shortCircuit.grounded,
        refusalReason: shortCircuit.refusalReason,
        injectionDetected: shortCircuit.injectionDetected,
      };
      return;
    }

    let content = '';
    const useUnified = shouldUseUnifiedChatMode();
    const useStructuredOnly = shouldUseStructuredChatOutput() && !env.CHAT_TOOLS_ENABLED;
    const useToolsOnly = env.CHAT_TOOLS_ENABLED && !shouldUseStructuredChatOutput();

    if (useUnified) {
      throwIfAborted(options.signal);
      const loopResult = await toolCallingLoopService.run(
        buildToolLoopInput(turn, input, correlationId, {
          signal: options.signal,
          structuredFinalOutput: true,
        }),
      );

      content = loopResult.content;
      for await (const token of streamBufferedText(content, options.signal)) {
        yield { type: 'token', content: token };
      }

      const enriched = loopResult.structuredParsed
        ? enrichFromStructured(loopResult.structuredParsed, turn)
        : enrichFromText(content, turn);

      yield {
        type: 'done',
        content: enriched.content,
        promptTokens: loopResult.promptTokens,
        completionTokens: loopResult.completionTokens,
        contextBlocks: turn.contextBlocks,
        citations: enriched.citations,
        grounded: enriched.grounded,
        refusalReason: enriched.refusalReason,
        injectionDetected: enriched.injectionDetected,
      };
      return;
    }

    if (useStructuredOnly) {
      throwIfAborted(options.signal);
      const structured = await completeStructured('chat', {
        workflow: 'chat',
        messages: turn.messages,
        workspaceId: input.workspaceId,
        correlationId,
        signal: options.signal,
      }, {
        promptId: 'chat-agent',
        promptVersion: turn.promptVersion,
        zodSchema: ChatResponseSchema,
      });

      content = structured.parsed.content;
      for await (const token of streamBufferedText(content, options.signal)) {
        yield { type: 'token', content: token };
      }

      const enriched = enrichFromStructured(structured.parsed, turn);

      yield {
        type: 'done',
        content: enriched.content,
        promptTokens: structured.response.promptTokens,
        completionTokens: structured.response.completionTokens,
        contextBlocks: turn.contextBlocks,
        citations: enriched.citations,
        grounded: enriched.grounded,
        refusalReason: enriched.refusalReason,
        injectionDetected: enriched.injectionDetected,
      };
      return;
    }

    if (useToolsOnly) {
      throwIfAborted(options.signal);
      const loopResult = await toolCallingLoopService.run(
        buildToolLoopInput(turn, input, correlationId, { signal: options.signal }),
      );

      for await (const token of streamBufferedText(loopResult.content, options.signal)) {
        content += token;
        yield { type: 'token', content: token };
      }

      const enriched = enrichFromText(content, turn);

      yield {
        type: 'done',
        content: enriched.content,
        promptTokens: loopResult.promptTokens,
        completionTokens: loopResult.completionTokens,
        contextBlocks: turn.contextBlocks,
        citations: enriched.citations,
        grounded: enriched.grounded,
        refusalReason: enriched.refusalReason,
        injectionDetected: enriched.injectionDetected,
      };
      return;
    }

    for await (const chunk of llmService.completeStream(
      {
        workflow: 'chat',
        messages: turn.messages,
        workspaceId: input.workspaceId,
        correlationId,
        signal: options.signal,
      },
      { promptId: 'chat-agent', promptVersion: turn.promptVersion },
    )) {
      throwIfAborted(options.signal);

      if (chunk.content) {
        content += chunk.content;
        yield { type: 'token', content: chunk.content };
      }

      if (chunk.done) {
        const enriched = enrichFromText(content, turn);

        yield {
          type: 'done',
          content: enriched.content,
          promptTokens: turn.promptTokens,
          completionTokens: Math.ceil(enriched.content.length / 4),
          contextBlocks: turn.contextBlocks,
          citations: enriched.citations,
          grounded: enriched.grounded,
          refusalReason: enriched.refusalReason,
          injectionDetected: enriched.injectionDetected,
        };
      }
    }
  }

  parseStructuredResponse(content: string) {
    try {
      return validateWithZod(ChatResponseSchema, content);
    } catch {
      return null;
    }
  }
}

export const chatAgent = new ChatAgentService();

export function buildChatCorrelationId(): string {
  return randomUUID();
}

export function buildChatMessage(input: ChatAgentInput, options?: { correlationId?: string }) {
  return createAgentMessage('chat', input.workspaceId, input, {
    meetingId: input.meetingId,
    correlationId: options?.correlationId ?? randomUUID(),
  });
}

// Re-export for callers that map citations directly.
export { mapChatCitations };
