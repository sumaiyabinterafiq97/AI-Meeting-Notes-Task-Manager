/** Cache namespaces — workspace-scoped keys use workspaceId prefix. */
export const CACHE_NAMESPACES = {
  RESPONSE: 'llm:cmp',
  EMBEDDING: 'llm:emb',
  PROMPT: 'llm:prm',
  RETRIEVAL: 'rag:ret',
  CONTEXT: 'rag:ctx',
  QUERY_EMBEDDING: 'rag:emb',
  EMBEDDING_BATCH: 'emb',
  SESSION: 'chat:session',
  CONVERSATION: 'chat:conv',
} as const;

export type CacheNamespace = (typeof CACHE_NAMESPACES)[keyof typeof CACHE_NAMESPACES];

export const DEFAULT_CACHE_TTL_SECONDS: Record<string, number> = {
  'llm:cmp': 86_400,
  'llm:emb': 604_800,
  'llm:prm': 3_600,
  'rag:ret': 900,
  'rag:ctx': 300,
  'rag:emb': 3_600,
  emb: 604_800,
  'chat:session': 86_400,
  'chat:conv': 3_600,
};

export const CACHE_HIT_RATE_ALERT_THRESHOLD = 0.2;
export const CACHE_MIN_SAMPLES_FOR_ALERT = 20;
