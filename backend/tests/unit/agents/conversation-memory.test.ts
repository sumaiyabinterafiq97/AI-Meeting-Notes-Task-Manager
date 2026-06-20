import {
  ConversationMemoryService,
  conversationMemoryService,
} from '../../../src/modules/agents/memory/conversation-memory.service';
import { sessionMemoryStore } from '../../../src/modules/agents/memory/session-memory.store';
import type { MemoryConfig } from '../../../src/modules/agents/memory/memory.types';

const testConfig: MemoryConfig = {
  maxMessages: 20,
  maxTokens: 4000,
  summarizeThreshold: 3200,
  keepRecentMessages: 6,
  rollingSummaryInterval: 10,
  summaryMaxChars: 2000,
  sessionTtlSeconds: 3600,
};

describe('conversation memory', () => {
  beforeEach(() => {
    sessionMemoryStore.clearMemory();
  });

  const history = Array.from({ length: 30 }, (_, i) => ({
    role: 'user' as const,
    content: `Message number ${i} `.padEnd(400, 'x'),
  }));

  it('limits message count', () => {
    const trimmed = conversationMemoryService.trimHistory(history);
    expect(trimmed.length).toBeLessThanOrEqual(20);
  });

  it('compresses long histories', async () => {
    const longHistory = Array.from({ length: 40 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i} `.padEnd(500, 'discussion about meetings tasks and decisions. '),
    }));
    const { compressed, droppedCount } = await conversationMemoryService.compressHistory(longHistory);
    expect(droppedCount).toBeGreaterThan(0);
    expect(compressed[0].role).toBe('system');
    expect(compressed[0].content).toContain('Prior conversation summary');
  });

  it('builds deterministic session keys', () => {
    expect(conversationMemoryService.buildSessionKey('ws-1', 'sess-1')).toBe(
      'chat:memory:ws-1:sess-1',
    );
  });

  it('normalizes empty and invalid messages', () => {
    const normalized = conversationMemoryService.normalizeHistory([
      { role: 'user', content: '  hello  ' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'world' },
    ]);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].content).toBe('hello');
  });

  it('detects rolling summary refresh interval', () => {
    const service = new ConversationMemoryService(testConfig);
    expect(service.shouldRefreshRollingSummary(9, 0)).toBe(false);
    expect(service.shouldRefreshRollingSummary(10, 0)).toBe(true);
    expect(service.shouldRefreshRollingSummary(19, 10)).toBe(false);
    expect(service.shouldRefreshRollingSummary(20, 10)).toBe(true);
  });

  it('prepareContext uses stored rolling summary for session', async () => {
    const service = new ConversationMemoryService({
      ...testConfig,
      summarizeThreshold: 100,
      keepRecentMessages: 2,
    });

    await sessionMemoryStore.set('ws-1', 'sess-1', {
      rollingSummary: 'Earlier: discussed OAuth rollout.',
      messageCount: 8,
      lastSummaryAtCount: 0,
      updatedAt: new Date().toISOString(),
    });

    const result = await service.prepareContext({
      workspaceId: 'ws-1',
      sessionId: 'sess-1',
      messageCount: 12,
      history: Array.from({ length: 8 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Turn ${i} `.padEnd(200, 'x'),
      })),
    });

    expect(result.rollingSummaryUsed).toBe(true);
    expect(result.messages[0].content).toContain('Earlier: discussed OAuth rollout.');
  });

  it('recordTurn persists rolling summary every interval', async () => {
    const service = new ConversationMemoryService(testConfig);
    const history = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `Message ${i}`,
    }));

    const state = await service.recordTurn({
      workspaceId: 'ws-1',
      sessionId: 'sess-2',
      messageCount: 10,
      history,
    });

    expect(state.messageCount).toBe(10);
    expect(state.rollingSummary).toBeTruthy();
    expect(state.lastSummaryAtCount).toBe(10);

    const stored = await sessionMemoryStore.get('ws-1', 'sess-2');
    expect(stored?.rollingSummary).toBeTruthy();
  });

  it('clearSession removes stored memory', async () => {
    await sessionMemoryStore.set('ws-1', 'sess-3', {
      rollingSummary: 'summary',
      messageCount: 5,
      lastSummaryAtCount: 0,
      updatedAt: new Date().toISOString(),
    });

    await conversationMemoryService.clearSession('ws-1', 'sess-3');
    expect(await sessionMemoryStore.get('ws-1', 'sess-3')).toBeNull();
  });

  it('rejects cross-workspace session scope', () => {
    const validation = conversationMemoryService.validateWorkspaceScope('ws-a', 'ws-b');
    expect(validation.valid).toBe(false);
    expect(validation.warnings).toHaveLength(1);
  });
});
