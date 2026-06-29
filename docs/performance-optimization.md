# Performance Optimization — MeetingMind AI

**Version:** 1.0  
**Module:** `backend/src/modules/observability/dashboards/performance-analyzer.service.ts`

---

## 1. Analysis Dimensions

| Dimension | Detection | Recommendation |
|-----------|-----------|----------------|
| Slow prompts | P95 > 45s on `llm.prompt.duration` | Switch model, trim prompt |
| Large contexts | `context.tokens` > 24k | Compress context, drop low-relevance chunks |
| Duplicate embeddings | Low `emb` cache hit rate | Content-hash dedup, skip unchanged |
| Expensive agents | High cost per agent in reports | Route to mini model |
| Slow retrievals | P95 > 300ms on `rag.retrieval.duration` | Enable retrieval cache |
| Excessive retries | `llm.retries.count` > 20 | Review provider health |

---

## 2. Automated Recommendations

`GET /observability/optimization` returns insights:

```json
{
  "insights": [
    {
      "recommendation": "enable_caching",
      "reason": "Cache hit rate is 15.0% — enable or tune response/retrieval caches",
      "estimatedSavingsPercent": 15
    }
  ]
}
```

Recommendation types: `enable_caching`, `compress_context`, `trim_prompt`, `batch_embeddings`, `switch_model`, `reduce_retries`, `reuse_summaries`.

---

## 3. Latency SLOs

| Operation | Target P95 |
|-----------|------------|
| API (non-AI) | 300ms |
| RAG retrieval | 300ms |
| LLM completion | 45s |
| Embedding batch | 5s |
| Agent execution | 60s |
| Chat first token | 2s |
| Graph pipeline | 90s |

Slow requests (>30s) logged at `warn` with full attribution (no PII).

---

## 4. Cost-Latency Tradeoffs

| Optimization | Latency Impact | Cost Impact |
|--------------|----------------|-------------|
| Response cache | −90% on hit | −100% on hit |
| gpt-4o-mini for chat | Similar | −60% |
| Context trimming | −10% | −15% tokens |
| Embedding batching | +batch latency | −50% API calls |
| Retrieval cache | −80% on hit | −query embed cost |

---

## 5. Load & Stress Testing

Tests in `observability/tests/observability.test.ts`:

- Concurrent metric recording (100 parallel)
- Cache hit/miss under load
- Retry storm simulation
- Provider outage detection
- Rate limit abuse pattern detection

For production load tests, use k6 or artillery against `/observability/metrics` and chat endpoints with `AI_USE_MOCK=true`.

---

## 6. Savings Tracking

```typescript
performanceAnalyzerService.trackSavings('enable_caching', 0.42);
// Increments cost.optimization.savings counter
```

---

## 7. Operational Playbook

1. Check `/observability/dashboard` for anomalies
2. Review slow requests in latency section
3. Run `/observability/optimization` for recommendations
4. Evaluate alerts via `POST /observability/alerts/evaluate`
5. Apply caching/model routing changes
6. Track savings over 7-day cost trend
