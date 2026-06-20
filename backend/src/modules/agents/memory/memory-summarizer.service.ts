import { env } from '../../../config/env';
import { llmService } from '../../llm';
import { promptRegistry } from '../../prompts';
import type { MemoryChatMessage } from './memory.types';
import { DEFAULT_MEMORY_CONFIG, ROLLING_SUMMARY_PREFIX } from './memory.constants';

export interface SummarizeHistoryInput {
  messages: MemoryChatMessage[];
  existingSummary?: string | null;
  workspaceId?: string;
  correlationId?: string;
  summaryMaxChars?: number;
}

function buildDeterministicRollingSummary(
  messages: MemoryChatMessage[],
  existingSummary: string | null | undefined,
  summaryMaxChars: number,
): string {
  const excerpt = messages
    .map((message) => `${message.role}: ${message.content.slice(0, 200)}`)
    .join('\n')
    .slice(0, summaryMaxChars);

  if (existingSummary?.trim()) {
    return `${existingSummary.trim()}\n${excerpt}`.slice(0, summaryMaxChars);
  }

  return excerpt;
}

function buildSummarizerUserContent(messages: MemoryChatMessage[]): string {
  return messages
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n\n')
    .slice(0, 12_000);
}

export class MemorySummarizerService {
  buildDeterministicSummary(input: SummarizeHistoryInput): string {
    return buildDeterministicRollingSummary(
      input.messages,
      input.existingSummary,
      input.summaryMaxChars ?? DEFAULT_MEMORY_CONFIG.summaryMaxChars,
    );
  }

  async summarizeHistory(input: SummarizeHistoryInput): Promise<string> {
    const maxChars = input.summaryMaxChars ?? DEFAULT_MEMORY_CONFIG.summaryMaxChars;

    if (!env.CHAT_MEMORY_LLM_SUMMARY || env.AI_USE_MOCK || input.messages.length === 0) {
      return this.buildDeterministicSummary(input);
    }

    const rendered = promptRegistry.render('chat-memory-summarizer', {
      variables: { existingSummary: input.existingSummary?.trim() ?? '' },
    });

    const systemMessage =
      rendered?.messages[0]?.content ??
      `${ROLLING_SUMMARY_PREFIX}. Summarize the conversation faithfully.`;

    try {
      const response = await llmService.complete(
        {
          workflow: 'chat',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: buildSummarizerUserContent(input.messages) },
          ],
          workspaceId: input.workspaceId,
          correlationId: input.correlationId,
          maxTokens: 512,
          temperature: 0.2,
        },
        { promptId: 'chat-memory-summarizer', promptVersion: rendered?.version ?? '1.0.0' },
      );

      const summary = response.content.trim();
      if (!summary) {
        return this.buildDeterministicSummary(input);
      }

      return summary.slice(0, maxChars);
    } catch {
      return this.buildDeterministicSummary(input);
    }
  }
}

export const memorySummarizerService = new MemorySummarizerService();
