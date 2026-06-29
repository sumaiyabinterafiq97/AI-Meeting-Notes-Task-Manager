# Hallucination Report — MeetingMind AI

**Date:** 2026-06-22  
**Method:** Architecture review + mock-provider integration tests + fixture inventory  
**Live LLM eval:** Not run (requires API keys + eval runner)

---

## Summary

| Metric | Target (docs) | Mock CI | Live (pending) |
|--------|---------------|---------|----------------|
| Hallucination rate | ≤ 5% | N/A (deterministic mock) | **Not measured** |
| Grounded chat | 100% with context | ✅ Refusal when empty | Pending |
| Citation validity | Required | ✅ Schema + parser tests | Pending |
| Empty over guess | Required | ✅ Zod + prompts | Pending |

---

## Controls in Place

1. **RAG grounding** — Chat receives only retrieved chunks, not full corpus
2. **Empty-context refusal** — No LLM call when `blocks.length === 0`
3. **Citation mapping** — `[CITATION-N]` tied to `chunkId` in context builder
4. **Anti-hallucination prompts** — Style guide + per-agent safety rules
5. **Zod validation** — All agent outputs validated before persistence
6. **v2.1 confidence scores** — Behind `PROMPT_SCHEMA_V2_1` flag

---

## Failure Patterns (Design-Level)

| Pattern | Risk | Mitigation |
|---------|------|------------|
| Fabricated assignee | Medium | Fuzzy match + null allowed in schema |
| Invented decisions | Medium | Decision agent scoped; empty array valid |
| Wrong meeting attribution | High | Citation `meetingId` in chunks |
| Stale embeddings | Medium | Re-embed on transcript edit |
| Mock embeddings low similarity | Low | Keyword FTS fallback in hybrid search |

---

## Eval Dataset Status

| Suite | Cases | Adversarial / empty |
|-------|-------|---------------------|
| summarizer | 7 | injection, empty transcript |
| task-extractor | 9 | ambiguous assignee |
| decision-agent | 8 | no decisions |
| risk-analyzer | 8 | standup low-signal |
| chat-agent | 10 | injection, no context |
| weekly-report | 8 | zero meetings |
| knowledge-agent | 10 | dedup |

**Total:** 60 golden cases in `backend/prompts/evaluations/fixtures/`

---

## Recommendations

| Priority | Action |
|----------|--------|
| P0 | Implement eval runner; gate CI on `hallucination_rate_max: 0.05` |
| P1 | Run live eval on 10 production-like transcripts monthly |
| P1 | Log `grounded: false` + `refusalReason` to observability dashboard |
| P2 | Human review sample for weekly reports before email delivery |

---

## Issue: BUG-001 Impact on Hallucination

Before fix, RAG returned 0 chunks → chat correctly refused but appeared "broken" to users who might retry with rephrasing, increasing token waste. Not hallucination, but UX risk. **Resolved.**
