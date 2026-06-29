import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import type { z } from 'zod';
import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import type { LLMCompletionRequest, LLMCompletionResponse } from '../types/llm.types';
import { validateWithZod } from '../services/zod-validator.service';

export function toLangChainMessages(messages: LLMCompletionRequest['messages']) {
  return messages.map((message) => {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      default:
        return new HumanMessage(message.content);
    }
  });
}

export function fromLangChainContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'object' && part && 'text' in part ? String(part.text) : ''))
      .join('');
  }
  return String(content ?? '');
}

/**
 * LangChain Runnable bridge over the provider-agnostic ILLMProvider interface.
 * Enables future LangGraph / chain composition without provider lock-in.
 */
export function createStructuredOutputChain<T>(
  provider: ILLMProvider,
  schema: z.ZodType<T>,
  baseRequest: Omit<LLMCompletionRequest, 'messages'>,
) {
  return RunnableLambda.from(async (messages: LLMCompletionRequest['messages']) => {
    const response = await provider.complete({
      ...baseRequest,
      messages,
      responseFormat: 'json_schema',
    });
    return validateWithZod(schema, response.content);
  });
}

export function createCompletionChain(
  provider: ILLMProvider,
  baseRequest: Omit<LLMCompletionRequest, 'messages'>,
) {
  return RunnableLambda.from(
    async (messages: LLMCompletionRequest['messages']): Promise<LLMCompletionResponse> => {
      return provider.complete({ ...baseRequest, messages });
    },
  );
}

export async function invokeStructuredChain<T>(
  chain: ReturnType<typeof createStructuredOutputChain<T>>,
  messages: LLMCompletionRequest['messages'],
): Promise<T> {
  return chain.invoke(messages);
}
