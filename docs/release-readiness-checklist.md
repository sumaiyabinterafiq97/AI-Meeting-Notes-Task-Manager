# Release Readiness Checklist — MeetingMind AI

**Target:** Production deployment  
**Date:** 2026-06-22  
**Owner:** Release Manager

---

## Quality Gates

| Check | Status | Evidence |
|-------|--------|----------|
| ✅ Tests passing | **PASS** | Backend 370/370, Frontend 81/81 |
| ✅ No critical bugs | **PASS** | BUG-001, BUG-002 fixed |
| ✅ No high severity security issues open | **PASS*** | SEC-001 fixed; set `OBSERVABILITY_API_KEY` in prod |
| ✅ Prompts evaluated (mock CI gate) | **PASS** | `npm run eval:prompts -- --mock --suite all` — schema_validity 100% |
| ⚠️ Prompts evaluated (live) | **PENDING** | Run `--live` with API keys before prod promotion |
| ⚠️ Hallucination rate acceptable | **PENDING** | Live eval + adversarial fixtures (`--strict`) |
| ⚠️ Latency acceptable (staging) | **PARTIAL** | Local mock load test passed; re-run on staging with live LLM |
| ⚠️ Costs acceptable | **PARTIAL** | Cost tracker implemented; 7-day prod baseline not captured |
| ✅ Documentation updated | **PASS** | QA reports + backend README |
| ⚠️ Docker working | **NOT VERIFIED** | `docker-compose.yml` exists — run manually |
| ✅ Migrations working | **PASS** | Prisma migrate in CI/dev |
| ✅ Observability enabled | **PASS** | `/observability/metrics`, structured logs |
| ⚠️ Production ready | **CONDITIONAL** | Staging OK; prod blocked on items below |

---

## Staging — Deploy Now

Staging is **approved** with current branch. Minimum env:

```bash
AI_USE_MOCK=false          # or true for cost-free smoke
REDIS_URL=...              # required when AI_USE_MOCK=false
OPENAI_API_KEY=...         # or primary provider
AI_PIPELINE_MODE=monolithic  # safer default; multi-agent after staging soak
OBSERVABILITY_API_KEY=...  # recommended on staging too
```

**Staging smoke:**

1. Upload transcript → processing completes
2. Chat returns grounded answer with citations
3. Weekly report generates
4. `GET /observability/metrics` returns Prometheus text
5. `GET /observability/dashboard` requires `X-Observability-Key` when key is set

**Deploy steps (Railway / Docker):**

```bash
npm run build --prefix backend
npm run prisma:deploy --prefix backend
# API: npm run start --prefix backend
# Worker: npm run worker --prefix backend
```

---

## Production — Blockers (promote only after)

| # | Gate | Command / action |
|---|------|------------------|
| 1 | Prompt eval CI | `npm run eval:prompts -- --mock --suite all --runs 1` in CI |
| 2 | Live prompt baseline | `npm run eval:prompts -- --live --suite all --strict` |
| 3 | Load test (50 jobs) | `AI_USE_MOCK=true npm run load:test:meetings -- --concurrency 50` on staging; repeat with `AI_USE_MOCK=false` |
| 4 | Observability key | Set `OBSERVABILITY_API_KEY` in production |
| 5 | 7-day baseline | Capture cost + latency from `/observability/dashboard` and `llm_usage_daily` |

---

## New CLI Commands

```bash
# Prompt regression (mock — CI default)
npm run eval:prompts -- --mock --suite all --runs 1

# Single suite / case
npm run eval:prompts -- --suite summarizer --case TC-SUM-001

# Live LLM + strict rule-based scoring
npm run eval:prompts -- --live --strict --suite all

# Concurrent meeting processing load test
npm run load:test:meetings -- --concurrency 50 --output docs/load-test-results.json
```

---

## Rollback Plan

- `AI_PIPELINE_MODE=monolithic` — disables LangGraph multi-agent
- `KNOWLEDGE_EXTRACTION_ENABLED=false` — skips knowledge agent
- `RAG_CACHE_ENABLED=false` — bypass cache if stale data

---

## Sign-Off

| Role | Status | Date |
|------|--------|------|
| QA | Conditional pass — staging | 2026-06-22 |
| Security | Conditional pass | 2026-06-22 |
| SRE | Pending staging load test + baseline | — |
| Product | Pending | — |

**Recommendation:** Deploy to **staging** now. Promote to **production** after live eval, staging load test with real LLM, and 7-day observability baseline.
