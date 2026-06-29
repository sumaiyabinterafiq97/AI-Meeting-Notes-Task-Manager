import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Ensure env is loaded before validation (config may be imported before server.ts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  MAX_WORKSPACES_PER_USER: z.coerce.number().default(10),
  INVITATION_EXPIRES_DAYS: z.coerce.number().default(7),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  LOCAL_LLM_BASE_URL: z.string().optional(),
  LOCAL_LLM_MODEL: z.string().default('llama3'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'gemini', 'local', 'voyage']).default('openai'),
  LLM_PRIMARY_PROVIDER: z
    .enum(['openai', 'anthropic', 'google', 'local', 'mock'])
    .default('openai'),
  LLM_FALLBACK_CHAIN: z.string().default('google,anthropic'),
  LLM_MAX_RETRIES: z.coerce.number().default(3),
  WORKSPACE_DAILY_TOKEN_BUDGET: z.coerce.number().default(500_000),
  AI_USE_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@example.com'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RAG_CACHE_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  RERANKER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  RAG_RETRIEVAL_CACHE_TTL_SECONDS: z.coerce.number().default(900),
  RAG_CONTEXT_CACHE_TTL_SECONDS: z.coerce.number().default(300),
  RAG_EMBEDDING_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  AI_PIPELINE_MODE: z.enum(['monolithic', 'multi-agent']).default('monolithic'),
  PROMPT_SCHEMA_V2_1: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  KNOWLEDGE_EXTRACTION_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CHAT_MEMORY_MAX_MESSAGES: z.coerce.number().default(20),
  CHAT_MEMORY_MAX_TOKENS: z.coerce.number().default(4000),
  CHAT_MEMORY_SUMMARIZE_THRESHOLD: z.coerce.number().default(3200),
  CHAT_MEMORY_KEEP_RECENT: z.coerce.number().default(6),
  CHAT_MEMORY_ROLLING_INTERVAL: z.coerce.number().default(10),
  CHAT_MEMORY_SUMMARY_MAX_CHARS: z.coerce.number().default(2000),
  CHAT_MEMORY_SESSION_TTL_SECONDS: z.coerce.number().default(86_400),
  CHAT_MEMORY_LLM_SUMMARY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CHAT_QUERY_CLASSIFIER_LLM: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CHAT_TOOLS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CHAT_TOOL_MAX_ITERATIONS: z.coerce.number().default(5),
  TRANSCRIPTION_PROVIDER: z.enum(['mock', 'openai']).default('openai'),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  AUDIO_STORAGE_PATH: z.string().default('./storage/audio'),
  AUDIO_MAX_BYTES: z.coerce.number().default(100 * 1024 * 1024),
  CALENDAR_USE_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z
    .string()
    .default('http://localhost:3001/api/v1/calendar/oauth/google/callback'),
  MICROSOFT_CALENDAR_CLIENT_ID: z.string().optional(),
  MICROSOFT_CALENDAR_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CALENDAR_REDIRECT_URI: z
    .string()
    .default('http://localhost:3001/api/v1/calendar/oauth/microsoft/callback'),
  CALENDAR_TOKEN_SECRET: z.string().optional(),
  CALENDAR_SYNC_LOOKBACK_DAYS: z.coerce.number().default(7),
  CALENDAR_SYNC_LOOKAHEAD_DAYS: z.coerce.number().default(30),
  CALENDAR_REMINDER_GRACE_MINUTES: z.coerce.number().default(60),
  OBSERVABILITY_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Environment validation failed');
  }

  return result.data;
}

export const env = loadEnv();
