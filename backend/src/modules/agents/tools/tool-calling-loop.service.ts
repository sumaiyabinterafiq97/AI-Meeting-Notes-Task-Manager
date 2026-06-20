import { randomUUID } from 'crypto';
import type { z } from 'zod';
import { llmService } from '../../llm';
import type { LLMMessage, LLMCompletionResponse } from '../../llm/types/llm.types';
import { completeStructured } from '../schemas/structured-output.service';
import type { ChatResponse } from '../schemas/zod-schemas';
import { DEFAULT_TOOL_MAX_ITERATIONS, TOOL_RESULT_MAX_CHARS } from './tool-calling.constants';
import { toolExecutorService, toolRegistryService } from './tool-executor.service';
import type { AgentToolContext, AgentToolResult } from './types/tool.types';

export interface StructuredFinalOutputOptions {
  zodSchema: z.ZodType<ChatResponse>;
}

export interface ToolCallingLoopInput {
  messages: LLMMessage[];
  toolContext: AgentToolContext;
  workspaceId: string;
  correlationId: string;
  promptVersion?: string;
  maxIterations?: number;
  signal?: AbortSignal;
  /** After tool iterations, synthesize a v2.1 structured chat response. */
  structuredFinalOutput?: StructuredFinalOutputOptions;
}

export interface ToolCallingLoopResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
  toolCallsExecuted: AgentToolResult[];
  iterations: number;
  structuredParsed?: ChatResponse;
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }

  return {};
}

function serializeToolResult(result: AgentToolResult): string {
  const payload = result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };

  const serialized = JSON.stringify(payload);
  if (serialized.length <= TOOL_RESULT_MAX_CHARS) {
    return serialized;
  }

  return `${serialized.slice(0, TOOL_RESULT_MAX_CHARS)}…`;
}

function accumulateTokens(
  total: Pick<ToolCallingLoopResult, 'promptTokens' | 'completionTokens'>,
  response: LLMCompletionResponse,
): void {
  total.promptTokens += response.promptTokens;
  total.completionTokens += response.completionTokens;
}

export class ToolCallingLoopService {
  private async synthesizeStructuredFinal(
    messages: LLMMessage[],
    input: ToolCallingLoopInput,
    totals: Pick<ToolCallingLoopResult, 'promptTokens' | 'completionTokens'>,
    toolCallsExecuted: AgentToolResult[],
    iterations: number,
  ): Promise<ToolCallingLoopResult> {
    const { response, parsed } = await completeStructured(
      'chat',
      {
        workflow: 'chat',
        messages,
        workspaceId: input.workspaceId,
        correlationId: input.correlationId,
        signal: input.signal,
      },
      {
        promptId: 'chat-agent',
        promptVersion: input.promptVersion,
        zodSchema: input.structuredFinalOutput!.zodSchema,
      },
    );

    accumulateTokens(totals, response);

    return {
      content: parsed.content,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      model: response.model,
      provider: response.provider,
      toolCallsExecuted,
      iterations,
      structuredParsed: parsed,
    };
  }

  async run(input: ToolCallingLoopInput): Promise<ToolCallingLoopResult> {
    const maxIterations = input.maxIterations ?? DEFAULT_TOOL_MAX_ITERATIONS;
    const messages: LLMMessage[] = [...input.messages];
    const tools = toolRegistryService.getToolDefinitions();
    const toolCallsExecuted: AgentToolResult[] = [];

    let lastResponse: LLMCompletionResponse = {
      content: '',
      model: 'none',
      provider: 'mock',
      promptTokens: 0,
      completionTokens: 0,
      finishReason: 'stop',
    };

    const totals = { promptTokens: 0, completionTokens: 0 };

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      lastResponse = await llmService.complete(
        {
          workflow: 'chat',
          messages,
          tools,
          toolChoice: 'auto',
          workspaceId: input.workspaceId,
          correlationId: input.correlationId,
          signal: input.signal,
        },
        { promptId: 'chat-agent', promptVersion: input.promptVersion },
      );

      accumulateTokens(totals, lastResponse);

      if (!lastResponse.toolCalls?.length) {
        if (input.structuredFinalOutput) {
          return this.synthesizeStructuredFinal(
            messages,
            input,
            totals,
            toolCallsExecuted,
            iteration + 1,
          );
        }

        return {
          content: lastResponse.content,
          promptTokens: totals.promptTokens,
          completionTokens: totals.completionTokens,
          model: lastResponse.model,
          provider: lastResponse.provider,
          toolCallsExecuted,
          iterations: iteration + 1,
        };
      }

      messages.push({
        role: 'assistant',
        content: lastResponse.content,
        toolCalls: lastResponse.toolCalls,
      });

      for (const toolCall of lastResponse.toolCalls) {
        const result = await toolExecutorService.execute(
          {
            name: toolCall.name,
            arguments: parseToolArguments(toolCall.arguments),
          },
          input.toolContext,
        );

        toolCallsExecuted.push(result);
        messages.push({
          role: 'tool',
          content: serializeToolResult(result),
          toolCallId: toolCall.id,
        });
      }
    }

    if (input.structuredFinalOutput) {
      return this.synthesizeStructuredFinal(
        messages,
        input,
        totals,
        toolCallsExecuted,
        maxIterations,
      );
    }

    return {
      content:
        lastResponse.content ||
        'I searched your workspace but could not finalize an answer within the tool limit.',
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      model: lastResponse.model,
      provider: lastResponse.provider,
      toolCallsExecuted,
      iterations: maxIterations,
    };
  }
}

export const toolCallingLoopService = new ToolCallingLoopService();

export function buildToolCallId(): string {
  return `call_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}
