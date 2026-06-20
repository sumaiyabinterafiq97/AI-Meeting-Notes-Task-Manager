import { createHash } from 'crypto';
import { buildCacheKey, getRedisClient } from '../../../config/redis';
import { env } from '../../../config/env';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryEntry>();

function hashText(text: string, model: string): string {
  return createHash('sha256').update(`${model}\0${text}`).digest('hex');
}

export class EmbeddingCacheService {
  private get ttlSeconds(): number {
    return env.RAG_EMBEDDING_CACHE_TTL_SECONDS;
  }

  buildKey(text: string, model: string): string {
    return buildCacheKey('emb', hashText(text, model));
  }

  async get(text: string, model: string): Promise<number[] | null> {
    if (!env.RAG_CACHE_ENABLED) {
      return null;
    }

    const key = this.buildKey(text, model);
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached) as number[];
        }
      } catch {
        // Fall through to memory cache
      }
    }

    const entry = memoryCache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    return JSON.parse(entry.value) as number[];
  }

  async getMany(texts: string[], model: string): Promise<(number[] | null)[]> {
    return Promise.all(texts.map((text) => this.get(text, model)));
  }

  async set(text: string, model: string, vector: number[]): Promise<void> {
    if (!env.RAG_CACHE_ENABLED) {
      return;
    }

    const key = this.buildKey(text, model);
    const serialized = JSON.stringify(vector);
    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.set(key, serialized, 'EX', this.ttlSeconds);
        return;
      } catch {
        // Fall through to memory cache
      }
    }

    memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async setMany(texts: string[], model: string, vectors: number[][]): Promise<void> {
    await Promise.all(texts.map((text, index) => this.set(text, model, vectors[index] ?? [])));
  }

  clearMemory(): void {
    memoryCache.clear();
  }
}

export const embeddingCacheService = new EmbeddingCacheService();
