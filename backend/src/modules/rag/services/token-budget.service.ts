import { estimateTokens } from '../../../lib/token-estimate';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';

export const RAG_TOKEN_BUDGETS = {
  systemPrompt: 500,
  userQuery: 500,
  chatHistory: 4_000,
  retrievedContext: 24_000,
  completionReserve: 4_000,
  totalChat: 32_000,
} as const;

export class TokenBudgetService {
  trimText(text: string, maxTokens: number): string {
    if (estimateTokens(text) <= maxTokens) {
      return text;
    }

    const maxChars = maxTokens * 4;
    return `${text.slice(0, maxChars).trim()}…`;
  }

  trimChunks(chunks: RetrievedChunk[], maxTokens: number): RetrievedChunk[] {
    const selected: RetrievedChunk[] = [];
    let usedTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = estimateTokens(chunk.content);
      if (usedTokens + chunkTokens > maxTokens) {
        break;
      }
      selected.push(chunk);
      usedTokens += chunkTokens;
    }

    return selected;
  }

  trimHistory<T extends { role: string; content: string }>(
    history: T[],
    maxTokens: number,
  ): T[] {
    const reversed = [...history].reverse();
    const selected: T[] = [];
    let usedTokens = 0;

    for (const message of reversed) {
      const messageTokens = estimateTokens(message.content);
      if (usedTokens + messageTokens > maxTokens) {
        break;
      }
      selected.unshift(message);
      usedTokens += messageTokens;
    }

    return selected;
  }
}

export const tokenBudgetService = new TokenBudgetService();
