# Retry Strategy — MeetingMind AI

**Version:** 1.0  
**Modules:** `observability/retry/`, `llm/services/retry-handler.service.ts`, `orchestrator/executors/`

---

## 1. Retry Policies

| Component | Max Retries | Backoff | Implementation |
|-----------|-------------|---------|----------------|
| LLM completion | 3 | 2s, 4s, 8s | `withRetry` in retry-handler.service |
| Orchestrator nodes | 2 | 2s, 4s, 8s | `withRetry` in retry.executor |
| Embedding batch | 3 | 2s, 4s, 8s | Provider-level retry |
| RAG retrieval | 1 | 1s | Degraded FTS fallback |
| Provider fallback | 1 per provider | Immediate | `resolveProviderChain()` |

---

## 2. Exponential Backoff

```
delay = min(baseDelayMs × 2^attempt, maxDelayMs)
```

Default: `baseDelayMs=2000`, `maxDelayMs=8000`

---

## 3. Circuit Breakers

- Per provider: opens after 5 failures in 60s (`circuit-breaker.service.ts`)
- Per orchestrator node: `workspaceId:nodeId` key (`circuit-breaker.executor.ts`)
- Open circuit → skip provider → try fallback chain

---

## 4. Timeouts

| Layer | Timeout |
|-------|---------|
| LLM completion | 120s |
| Orchestrator node | 120s (default) |
| Pipeline | 300s |
| Stream cancel | 5s after client disconnect |

---

## 5. Fallback Providers

Chain from `LLM_FALLBACK_CHAIN` env (default: `google,anthropic`).

On primary failure after retries → next provider in chain.

---

## 6. Dead Letter Queues

BullMQ failed jobs retained with `failed` status. Job record includes error details.

Monitor: `bullmq.job.failed` metric, queue depth via `dashboardMetricsService.setQueueDepth()`.

---

## 7. Observability

```typescript
retryObservabilityService.recordRetry({
  component: 'llm',
  attempt: 2,
  maxAttempts: 3,
  provider: 'openai',
  reason: '429 rate limit',
});

retryObservabilityService.recordProviderOutage('openai', '5xx errors');
```

| Metric | Description |
|--------|-------------|
| `llm.retries.count` | Total retry attempts |
| `provider.outage` | Provider unavailable events |

Dashboard: `GET /observability/dashboard` → `retries` section.

---

## 8. Failure Handling

After max retries:
- LLM: log to `llm_invocations` with `FAILED` status
- Agent: partial pipeline persist; failed agents in `agent_executions`
- Job: BullMQ marks `FAILED`; ops alert if failure rate > 10%/hr
