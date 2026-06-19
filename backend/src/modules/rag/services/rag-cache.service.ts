import { createHash } from 'crypto';
import { buildCacheKey, getRedisClient } from '../../../config/redis';
import { env } from '../../../config/env';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryEntry>();

function hashValue(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export class RagCacheService {
  private readonly enabled = env.RAG_CACHE_ENABLED;

  async get<T>(namespace: string, keyParts: string[]): Promise<T | null> {
    if (!this.enabled) return null;

    const key = buildCacheKey(namespace, ...keyParts);

    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch {
        // Fall through to memory cache
      }
    }

    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    return JSON.parse(entry.value) as T;
  }

  async set<T>(
    namespace: string,
    keyParts: string[],
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.enabled) return;

    const key = buildCacheKey(namespace, ...keyParts);
    const serialized = JSON.stringify(value);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch {
        // Fall through to memory cache
      }
    }

    memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  buildQueryHash(query: string, filters: Record<string, unknown>): string {
    return hashValue(JSON.stringify({ query, filters }));
  }

  async invalidateWorkspace(workspaceId: string): Promise<void> {
    const prefix = buildCacheKey('rag:ret', workspaceId);
    const redis = getRedisClient();

    if (redis) {
      try {
        const keys = await redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // ignore
      }
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }

  clearMemory(): void {
    memoryCache.clear();
  }
}

export const ragCacheService = new RagCacheService();
