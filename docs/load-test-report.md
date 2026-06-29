# Load Test Report — MeetingMind AI

**Date:** 2026-06-22  
**Status:** **Local mock executed** — staging live-LLM run pending

---

## Scenario 2 — 50 Concurrent Meeting Jobs (local mock)

**Command:**

```bash
AI_USE_MOCK=true npm run load:test:meetings -- --concurrency 50
```

**Environment:** Local dev DB, `AI_PIPELINE_MODE=monolithic`, inline processing (no Redis queue).

| Metric | Result | Target |
|--------|--------|--------|
| Concurrency | 50 | 50 |
| Success rate | 100% (50/50) | 100% |
| Wall time | ~2.1 s | < 10 min |
| P50 latency | ~533 ms | — |
| P95 latency | ~558 ms | < 600 s |
| Failures | 0 | 0 |

**Verdict:** **PASS** (mock provider). Validates job orchestration, DB writes, and concurrent pipeline stability under local conditions.

**Caveat:** Mock LLM is fast and deterministic. Re-run on **staging** with `AI_USE_MOCK=false`, Redis worker, and real provider before production sign-off.

---

## Scenario 1 — 50 Concurrent Chat Requests

**Status:** Not executed. Use k6/Artillery against `POST /api/v1/workspaces/:id/chat` (SSE).

| Target | P95 < 8s, 0% 5xx |

---

## Planned Scenarios (remaining)

| Scenario | Tool | Target |
|----------|------|--------|
| 50 concurrent chat requests | k6 / Artillery | P95 < 8s, 0% 5xx |
| 50 concurrent meeting jobs (staging, live LLM) | `npm run load:test:meetings` | 100% success, queue drain < 10 min |
| Burst auth (100 req/s) | k6 | Rate limit triggers, no crash |
| Large transcript (2h meeting) | Single job | Memory < 512MB worker |
| Redis outage | Chaos | Graceful FTS fallback |
| Provider outage | Mock fail | Fallback chain activates |

---

## Infrastructure Assumptions

- API: 2× Railway instances
- Worker: 2× with concurrency 5
- Neon PostgreSQL + pgvector
- Redis for BullMQ + RAG cache

---

## Script Location

`backend/scripts/load-test-meeting-jobs.ts` — seeds ephemeral workspace, runs N parallel `processMeetingJob` calls, auto-cleans up.

```bash
npm run load:test:meetings -- --concurrency 50 --output docs/load-test-results.json
npm run load:test:meetings -- --concurrency 50 --no-cleanup   # debug failures
```

---

## Recommendation

**P0 before GA:** Re-run scenario 2 on staging with live LLM + Redis worker. Add k6 script for scenario 1. Document results as v1.2 in this file.
