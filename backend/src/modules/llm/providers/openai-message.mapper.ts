import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { LLMCompletionRequest } from '../types/llm.types';

export function toOpenAIMessages(
  messages: LLMCompletionRequest['messages'],
): ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        content: message.content,
        tool_call_id: message.toolCallId ?? '',
      };
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: 'function' as const,
          function: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        })),
      };
    }

    return {
      role: message.role as 'system' | 'user' | 'assistant',
      content: message.content,
    };
  });
}
