import { buildCacheKey, getRedisClient } from '../../../config/redis';
import { DEFAULT_MEMORY_CONFIG, MEMORY_NAMESPACE } from './memory.constants';
import type { SessionMemoryState } from './memory.types';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function emptyState(): SessionMemoryState {
  return {
    rollingSummary: null,
    messageCount: 0,
    lastSummaryAtCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

export class SessionMemoryStore {
  buildSessionKey(workspaceId: string, sessionId: string): string {
    return buildCacheKey(MEMORY_NAMESPACE, workspaceId, sessionId);
  }

  async get(workspaceId: string, sessionId: string): Promise<SessionMemoryState | null> {
    const key = this.buildSessionKey(workspaceId, sessionId);
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached) as SessionMemoryState;
        }
      } catch {
        // Fall through to in-memory store
      }
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }

    return JSON.parse(entry.value) as SessionMemoryState;
  }

  async getOrCreate(workspaceId: string, sessionId: string): Promise<SessionMemoryState> {
    const existing = await this.get(workspaceId, sessionId);
    return existing ?? emptyState();
  }

  async set(
    workspaceId: string,
    sessionId: string,
    state: SessionMemoryState,
    ttlSeconds = DEFAULT_MEMORY_CONFIG.sessionTtlSeconds,
  ): Promise<void> {
    const key = this.buildSessionKey(workspaceId, sessionId);
    const serialized = JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    });

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch {
        // Fall through to in-memory store
      }
    }

    memoryStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async clear(workspaceId: string, sessionId: string): Promise<void> {
    const key = this.buildSessionKey(workspaceId, sessionId);
    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.del(key);
      } catch {
        // ignore
      }
    }

    memoryStore.delete(key);
  }

  clearMemory(): void {
    memoryStore.clear();
  }
}

export const sessionMemoryStore = new SessionMemoryStore();
