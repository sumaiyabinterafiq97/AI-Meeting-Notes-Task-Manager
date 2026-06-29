# Accuracy Report — MeetingMind AI

**Date:** 2026-06-22  
**Environment:** `AI_USE_MOCK=true` (CI)  
**Live accuracy metrics:** Pending eval runner + production transcripts

---

## Measurement Framework

Per `backend/prompts/evaluations/fixtures/manifest.yaml`:

| Metric | Gate |
|--------|------|
| schema_validity_min | 0.98 |
| hallucination_rate_max | 0.05 |
| precision_drop_max_vs_baseline | 0.05 |
| consistency_threshold | 0.90 (3 runs/case) |

---

## Agent Accuracy (Mock / Schema)

| Agent | Schema tests | Service unit tests | Integration | Live F1 |
|-------|--------------|-------------------|-------------|---------|
| Summarizer | ✅ zod-schemas | ✅ | ✅ pipeline | **TBD** |
| Task extractor | ✅ | ✅ | ✅ | **TBD** |
| Decision | ✅ | ✅ | ✅ | **TBD** |
| Risk analyzer | ✅ | ✅ | ✅ | **TBD** |
| Knowledge | ✅ | ✅ | ✅ | **TBD** |
| Weekly report | ✅ | ✅ | ✅ | **TBD** |
| Chat | ✅ | ✅ | ✅ RAG | **TBD** |

**Schema validity (unit):** 100% on mock structured outputs  
**Live precision/recall:** Requires `npm run eval:prompts` — not yet implemented

---

## RAG Retrieval Accuracy

| Test | Result |
|------|--------|
| Embed + semantic search | ✅ Integration pass |
| Hybrid search (post BUG-001 fix) | ✅ Integration pass |
| Date range filter | ✅ Integration pass |
| Cache hit on repeat query | ✅ Verified |
| Cross-workspace isolation | ⚠️ Add explicit test |

---

## Known Accuracy Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock embeddings ≠ OpenAI geometry | Retrieval ranking differs in prod | Re-validate hybrid recall with live embeddings |
| Monolithic vs multi-agent drift | Output shape differences | Feature flag `AI_PIPELINE_MODE` |
| Assignee fuzzy match false positives | Wrong task owner | Human accept/reject on suggestions |

---

## Next Steps

1. Implement eval runner with `rule_based` + `schema_validity` scorers
2. Establish baseline on 60 fixtures with `gpt-4o-mini`
3. Track per-agent F1 in `llm_invocations` metadata (future)
