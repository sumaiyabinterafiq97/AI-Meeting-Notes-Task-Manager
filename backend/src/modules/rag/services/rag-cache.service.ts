import { createHash } from 'crypto';
import { buildCacheKey, getRedisClient } from '../../../config/redis';
import { env } from '../../../config/env';
import { ragCacheObservabilityService } from './rag-cache-observability.service';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryEntry>();

function hashValue(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export type RagCacheNamespace = 'rag:ret' | 'rag:ctx';

export class RagCacheService {
  private readonly enabled = env.RAG_CACHE_ENABLED;

  private get retrievalTtl(): number {
    return env.RAG_RETRIEVAL_CACHE_TTL_SECONDS;
  }

  private get contextTtl(): number {
    return env.RAG_CONTEXT_CACHE_TTL_SECONDS;
  }

  async get<T>(
    namespace: RagCacheNamespace,
    keyParts: string[],
    workspaceId?: string,
  ): Promise<T | null> {
    if (!this.enabled) {
      ragCacheObservabilityService.record({ namespace, hit: false, workspaceId });
      return null;
    }

    const key = buildCacheKey(namespace, ...keyParts);
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          ragCacheObservabilityService.record({ namespace, hit: true, workspaceId });
          return JSON.parse(cached) as T;
        }
      } catch {
        // Fall through to memory cache
      }
    }

    const entry = memoryCache.get(key);
    if (!entry) {
      ragCacheObservabilityService.record({ namespace, hit: false, workspaceId });
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      ragCacheObservabilityService.record({ namespace, hit: false, workspaceId });
      return null;
    }

    ragCacheObservabilityService.record({ namespace, hit: true, workspaceId });
    return JSON.parse(entry.value) as T;
  }

  async set<T>(
    namespace: RagCacheNamespace,
    keyParts: string[],
    value: T,
    ttlSeconds?: number,
    workspaceId?: string,
  ): Promise<void> {
    if (!this.enabled) return;

    const ttl =
      ttlSeconds ??
      (namespace === 'rag:ctx' ? this.contextTtl : this.retrievalTtl);

    const key = buildCacheKey(namespace, ...keyParts);
    const serialized = JSON.stringify(value);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(key, serialized, 'EX', ttl);
        return;
      } catch {
        // Fall through to memory cache
      }
    }

    memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttl * 1000,
    });

    void workspaceId;
  }

  buildQueryHash(query: string, filters: Record<string, unknown>): string {
    return hashValue(JSON.stringify({ query, filters }));
  }

  buildContextHash(blockIds: string[], query: string): string {
    return hashValue(JSON.stringify({ blockIds, query }));
  }

  async getRetrieval<T>(workspaceId: string, queryHash: string): Promise<T | null> {
    return this.get<T>('rag:ret', [workspaceId, queryHash], workspaceId);
  }

  async setRetrieval<T>(
    workspaceId: string,
    queryHash: string,
    value: T,
  ): Promise<void> {
    await this.set('rag:ret', [workspaceId, queryHash], value, this.retrievalTtl, workspaceId);
  }

  async getContext<T>(workspaceId: string, contextHash: string): Promise<T | null> {
    return this.get<T>('rag:ctx', [workspaceId, contextHash], workspaceId);
  }

  async setContext<T>(
    workspaceId: string,
    contextHash: string,
    value: T,
  ): Promise<void> {
    await this.set('rag:ctx', [workspaceId, contextHash], value, this.contextTtl, workspaceId);
  }

  async invalidateWorkspace(workspaceId: string): Promise<void> {
    const prefixes = [
      buildCacheKey('rag:ret', workspaceId),
      buildCacheKey('rag:ctx', workspaceId),
    ];
    const redis = getRedisClient();

    if (redis) {
      try {
        for (const prefix of prefixes) {
          const keys = await redis.keys(`${prefix}*`);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        }
      } catch {
        // ignore
      }
    }

    for (const key of memoryCache.keys()) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        memoryCache.delete(key);
      }
    }
  }

  clearMemory(): void {
    memoryCache.clear();
  }

  getStats() {
    return ragCacheObservabilityService.getSnapshot();
  }
}

export const ragCacheService = new RagCacheService();
