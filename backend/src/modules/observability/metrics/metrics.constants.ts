/** Standard metric names — Prometheus-compatible dot notation. */
export const METRIC_NAMES = {
  REQUEST_COUNT: 'http.request.count',
  REQUEST_SUCCESS: 'http.request.success',
  REQUEST_FAILURE: 'http.request.failure',
  RETRY_COUNT: 'llm.retries.count',
  LATENCY: 'latency.duration',
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  QUEUE_TIME: 'bullmq.queue.wait',
  EMBEDDING_TIME: 'llm.embedding.duration',
  RETRIEVAL_TIME: 'rag.retrieval.duration',
  PROMPT_TIME: 'llm.prompt.duration',
  AGENT_TIME: 'agent.execution.duration',
  GRAPH_TIME: 'orchestrator.graph.duration',
  RESPONSE_SIZE: 'response.size.bytes',
  CONTEXT_SIZE: 'context.tokens',
  RATE_LIMIT_VIOLATION: 'ratelimit.exceeded',
  PROVIDER_OUTAGE: 'provider.outage',
} as const;

export const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1_000, 5_000, 30_000, 60_000, 120_000] as const;

export const SLOW_REQUEST_THRESHOLD_MS = 30_000;
