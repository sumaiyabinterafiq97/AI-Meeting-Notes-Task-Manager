import { env } from '../../../config/env';
import type { MemoryConfig } from './memory.types';

export const MEMORY_NAMESPACE = 'chat:memory';

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxMessages: env.CHAT_MEMORY_MAX_MESSAGES,
  maxTokens: env.CHAT_MEMORY_MAX_TOKENS,
  summarizeThreshold: env.CHAT_MEMORY_SUMMARIZE_THRESHOLD,
  keepRecentMessages: env.CHAT_MEMORY_KEEP_RECENT,
  rollingSummaryInterval: env.CHAT_MEMORY_ROLLING_INTERVAL,
  summaryMaxChars: env.CHAT_MEMORY_SUMMARY_MAX_CHARS,
  sessionTtlSeconds: env.CHAT_MEMORY_SESSION_TTL_SECONDS,
};

export const ROLLING_SUMMARY_PREFIX = 'Prior conversation summary';
