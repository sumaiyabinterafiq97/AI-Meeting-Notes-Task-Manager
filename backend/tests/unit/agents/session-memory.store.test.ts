import { sessionMemoryStore } from '../../../src/modules/agents/memory/session-memory.store';

describe('session memory store', () => {
  beforeEach(() => {
    sessionMemoryStore.clearMemory();
  });

  it('stores and retrieves session state in memory', async () => {
    const state = {
      rollingSummary: 'Discussed Q3 roadmap.',
      messageCount: 12,
      lastSummaryAtCount: 10,
      updatedAt: new Date().toISOString(),
    };

    await sessionMemoryStore.set('ws-1', 'sess-1', state, 3600);
    const loaded = await sessionMemoryStore.get('ws-1', 'sess-1');

    expect(loaded?.rollingSummary).toBe('Discussed Q3 roadmap.');
    expect(loaded?.messageCount).toBe(12);
  });

  it('returns empty state when session is new', async () => {
    const state = await sessionMemoryStore.getOrCreate('ws-1', 'new-session');
    expect(state.rollingSummary).toBeNull();
    expect(state.messageCount).toBe(0);
  });

  it('clears session memory', async () => {
    await sessionMemoryStore.set('ws-1', 'sess-1', {
      rollingSummary: null,
      messageCount: 1,
      lastSummaryAtCount: 0,
      updatedAt: new Date().toISOString(),
    });

    await sessionMemoryStore.clear('ws-1', 'sess-1');
    expect(await sessionMemoryStore.get('ws-1', 'sess-1')).toBeNull();
  });
});
