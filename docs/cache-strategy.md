# Cache Strategy — MeetingMind AI

**Version:** 1.0  
**Module:** `backend/src/modules/observability/cache/`

---

## 1. Cache Layers

| Layer | Namespace | TTL | Scope |
|-------|-----------|-----|-------|
| LLM response | `llm:cmp` | 24h | Per workspace |
| Embedding | `llm:emb` / `emb` | 7d | Global (content-hash keyed) |
| Prompt render | `llm:prm` | 1h | Per workspace |
| Retrieval results | `rag:ret` | 15min | Per workspace |
| Context blocks | `rag:ctx` | 5min | Per workspace |
| Query embedding | `rag:emb` | 1h | Global |
| Chat session | `chat:session` | 24h | Per user |
| Conversation | `chat:conv` | 1h | Per session |

---

## 2. Key Design

- Keys use `buildCacheKey(namespace, ...parts)` from `config/redis.ts`
- Workspace isolation: retrieval/context keys include `workspaceId`
- No cross-workspace cache sharing for tenant data
- Redis primary; in-memory fallback when `REDIS_URL` unset

---

## 3. Invalidation

| Event | Action |
|-------|--------|
| Meeting transcript edit | Invalidate `llm:cmp` for meeting hash |
| Meeting update/delete | `ragCacheService.invalidateWorkspace(workspaceId)` |
| Model change | Re-embed job; embedding cache miss on new model |
| Prompt version bump | Natural miss on `llm:prm` (version in key) |

---

## 4. Observability

All cache operations record hits/misses via `CacheObservabilityService`:

```typescript
cacheObservabilityService.record({ namespace: 'rag:ret', hit: true, workspaceId });
```

| Metric | Description |
|--------|-------------|
| `cache.hit` | Counter by namespace |
| `cache.miss` | Counter by namespace |
| Hit rate | Derived: hits / (hits + misses) |

**Alert:** Hit rate below 20% after 20+ samples → `low_cache_hit_ratio` alert.

---

## 5. Memory Monitoring

- Redis memory: monitor via infrastructure (Upstash dashboard)
- In-memory fallback: bounded by TTL eviction in `RagCacheService`
- Dashboard: `GET /observability/dashboard` → `cache` section

---

## 6. Tuning Recommendations

| Symptom | Action |
|---------|--------|
| Low retrieval hit rate | Increase `RAG_RETRIEVAL_CACHE_TTL_SECONDS` |
| Stale context in chat | Decrease `RAG_CONTEXT_CACHE_TTL_SECONDS` |
| High embedding cost | Verify `emb` namespace hit rate; batch size 100 |
| Memory pressure | Reduce TTLs; enable Redis with eviction policy |
