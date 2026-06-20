import { env } from '../../../config/env';
import { estimateTokens } from '../../../lib/token-estimate';
import { DEFAULT_MEMORY_CONFIG, ROLLING_SUMMARY_PREFIX } from './memory.constants';
import { memorySummarizerService } from './memory-summarizer.service';
import { sessionMemoryStore } from './session-memory.store';
import type {
  MemoryChatMessage,
  MemoryConfig,
  MemoryValidationResult,
  PrepareContextInput,
  PrepareContextResult,
  RecordTurnInput,
  SessionMemoryState,
} from './memory.types';

export type { MemoryChatMessage } from './memory.types';

export class ConversationMemoryService {
  constructor(private readonly config: MemoryConfig = DEFAULT_MEMORY_CONFIG) {}

  buildSessionKey(workspaceId: string, sessionId: string): string {
    return sessionMemoryStore.buildSessionKey(workspaceId, sessionId);
  }

  normalizeHistory(history: MemoryChatMessage[]): MemoryChatMessage[] {
    return history
      .filter(
        (message) =>
          (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
          message.content.trim().length > 0,
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));
  }

  estimateHistoryTokens(history: MemoryChatMessage[]): number {
    return history.reduce((sum, message) => sum + estimateTokens(message.content), 0);
  }

  trimHistory(history: MemoryChatMessage[]): MemoryChatMessage[] {
    const recent = history.slice(-this.config.maxMessages);
    return this.trimToTokenBudget(recent, this.config.maxTokens);
  }

  trimToTokenBudget(messages: MemoryChatMessage[], budget: number): MemoryChatMessage[] {
    const result: MemoryChatMessage[] = [];
    let tokens = 0;

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      const messageTokens = estimateTokens(message.content);
      if (tokens + messageTokens > budget) break;
      result.unshift(message);
      tokens += messageTokens;
    }

    return result;
  }

  needsCompression(history: MemoryChatMessage[]): boolean {
    return this.estimateHistoryTokens(history) > this.config.summarizeThreshold;
  }

  shouldRefreshRollingSummary(messageCount: number, lastSummaryAtCount: number): boolean {
    if (messageCount < this.config.rollingSummaryInterval) {
      return false;
    }
    return messageCount - lastSummaryAtCount >= this.config.rollingSummaryInterval;
  }

  /** Deterministic fallback — prefer {@link summarizeHistory} for production. */
  buildRollingSummary(messages: MemoryChatMessage[], existingSummary?: string | null): string {
    return memorySummarizerService.buildDeterministicSummary({
      messages,
      existingSummary,
      summaryMaxChars: this.config.summaryMaxChars,
    });
  }

  async summarizeHistory(
    messages: MemoryChatMessage[],
    existingSummary?: string | null,
    options: { workspaceId?: string; correlationId?: string } = {},
  ): Promise<string> {
    return memorySummarizerService.summarizeHistory({
      messages,
      existingSummary,
      workspaceId: options.workspaceId,
      correlationId: options.correlationId,
      summaryMaxChars: this.config.summaryMaxChars,
    });
  }

  async compressHistory(
    history: MemoryChatMessage[],
    existingSummary?: string | null,
    options: { workspaceId?: string; correlationId?: string } = {},
  ): Promise<{
    compressed: MemoryChatMessage[];
    droppedCount: number;
    rollingSummaryUsed: boolean;
  }> {
    if (!this.needsCompression(history)) {
      return { compressed: this.trimHistory(history), droppedCount: 0, rollingSummaryUsed: false };
    }

    const keepRecent = this.config.keepRecentMessages;
    const older = history.slice(0, -keepRecent);
    const recent = history.slice(-keepRecent);

    if (older.length === 0) {
      return {
        compressed: this.trimHistory(history),
        droppedCount: 0,
        rollingSummaryUsed: Boolean(existingSummary),
      };
    }

    const summaryContent = await this.summarizeHistory(older, existingSummary, options);
    const compressed: MemoryChatMessage[] = [
      {
        role: 'system',
        content: `${ROLLING_SUMMARY_PREFIX} (${older.length} messages):\n${summaryContent}`,
      },
      ...recent,
    ];

    return {
      compressed: this.trimHistory(compressed),
      droppedCount: older.length,
      rollingSummaryUsed: true,
    };
  }

  validateWorkspaceScope(
    workspaceId: string,
    sessionWorkspaceId?: string,
  ): MemoryValidationResult {
    if (!sessionWorkspaceId || sessionWorkspaceId === workspaceId) {
      return { valid: true, warnings: [] };
    }

    return {
      valid: false,
      warnings: ['Session memory is scoped to a different workspace and was not loaded.'],
    };
  }

  async prepareContext(input: PrepareContextInput): Promise<PrepareContextResult> {
    const normalized = this.normalizeHistory(input.history);
    const messageCount = input.messageCount ?? normalized.length;
    const summarizeOptions = { workspaceId: input.workspaceId };

    if (!input.sessionId) {
      const { compressed, droppedCount, rollingSummaryUsed } = await this.compressHistory(
        normalized,
        undefined,
        summarizeOptions,
      );
      return {
        messages: compressed,
        droppedCount,
        tokenCount: this.estimateHistoryTokens(compressed),
        rollingSummaryUsed,
      };
    }

    const state = await sessionMemoryStore.getOrCreate(input.workspaceId, input.sessionId);
    const shouldRefresh = this.shouldRefreshRollingSummary(messageCount, state.lastSummaryAtCount);
    const shouldCompress = this.needsCompression(normalized) || shouldRefresh;

    if (!shouldCompress) {
      const trimmed = this.trimHistory(normalized);
      return {
        messages: trimmed,
        droppedCount: 0,
        tokenCount: this.estimateHistoryTokens(trimmed),
        rollingSummaryUsed: Boolean(state.rollingSummary),
        sessionKey: this.buildSessionKey(input.workspaceId, input.sessionId),
      };
    }

    const { compressed, droppedCount, rollingSummaryUsed } = await this.compressHistory(
      normalized,
      state.rollingSummary,
      summarizeOptions,
    );

    return {
      messages: compressed,
      droppedCount,
      tokenCount: this.estimateHistoryTokens(compressed),
      rollingSummaryUsed: rollingSummaryUsed || Boolean(state.rollingSummary),
      sessionKey: this.buildSessionKey(input.workspaceId, input.sessionId),
    };
  }

  async recordTurn(input: RecordTurnInput): Promise<SessionMemoryState> {
    const normalized = this.normalizeHistory(input.history);
    const state = await sessionMemoryStore.getOrCreate(input.workspaceId, input.sessionId);
    const nextState: SessionMemoryState = {
      ...state,
      messageCount: input.messageCount,
      updatedAt: new Date().toISOString(),
    };

    if (this.shouldRefreshRollingSummary(input.messageCount, state.lastSummaryAtCount)) {
      const keepRecent = this.config.keepRecentMessages;
      const older = normalized.slice(0, -keepRecent);
      nextState.rollingSummary = await this.summarizeHistory(older, state.rollingSummary, {
        workspaceId: input.workspaceId,
      });
      nextState.lastSummaryAtCount = input.messageCount;
    }

    await sessionMemoryStore.set(input.workspaceId, input.sessionId, nextState);
    return nextState;
  }

  async clearSession(workspaceId: string, sessionId: string): Promise<void> {
    await sessionMemoryStore.clear(workspaceId, sessionId);
  }
}

export const conversationMemoryService = new ConversationMemoryService();
