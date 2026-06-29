# Latency Report — MeetingMind AI

**Date:** 2026-06-22  
**Source:** Integration test logs, observability module design, unit latency tracker tests

---

## Observed Latencies (Mock / Local DB)

From integration test structured logs (representative):

| Operation | Typical (mock) | Notes |
|-----------|----------------|-------|
| RAG retrieval (hybrid) | 10–15 ms | After cache warm: <2 ms |
| RAG pipeline (full) | 15–25 ms | embed + search + context + prompt |
| Meeting embed (2 chunks) | 4–8 ms | Mock embeddings |
| Chat non-streaming | 20–90 ms | Includes RAG + mock LLM |
| Transcript upload + inline AI | 80–120 ms | Mock monolithic/multi-agent |

**P50/P95/P99 production targets (from NFR docs):** Not validated — no load test run.

---

## Instrumentation

| Component | Metric | Endpoint |
|-----------|--------|----------|
| RAG | `rag.retrieval.duration` | `/observability/metrics` |
| LLM | `llm_invocations.latency_ms` | PostgreSQL |
| Agents | `agent.execution.duration` | Prometheus histogram |
| Orchestrator | `orchestrator.graph.duration` | Prometheus |

`LatencyTrackerService` unit tests: ✅ pass

---

## Bottleneck Analysis (Design)

| Stage | Risk | Optimization |
|-------|------|--------------|
| Embedding API | High in prod | Batch size 100; cache query embeddings |
| pgvector ANN | Medium at scale | HNSW tuning; read replica |
| Multi-agent graph | High | Parallel phase 1; timeout per node |
| Context builder | Low | Token budget compression |
| Redis cache miss | Medium | Tune TTLs per cache-strategy.md |

---

## Recommendations

| Priority | Action |
|----------|--------|
| P0 | Define SLO: chat P95 < 8s (stream first token < 2s) |
| P1 | Load test 50 concurrent chat + 50 embed jobs |
| P2 | Enable `RERANKER_ENABLED` only after latency baseline |

---

## Issue

No production P50/P95/P99 captured yet. This report documents **architecture readiness** and **mock-environment measurements** only.
