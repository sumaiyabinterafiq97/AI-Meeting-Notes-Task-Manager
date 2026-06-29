# Bug Report — MeetingMind AI

**Date:** 2026-06-22  
**Source:** QA validation cycle

---

## Resolved (Fixed in This Cycle)

### BUG-001 — RAG hybrid search returns zero results

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Impact** | Chat always refused (empty context); semantic search appeared broken in hybrid mode |
| **Root cause** | `rankingService.applyThreshold(0.65)` applied to RRF fusion scores (~0.01–0.05), filtering all chunks |
| **Fix** | Apply cosine threshold only for `semantic` mode in `hybrid.retriever.ts` and `rag-pipeline.service.ts` |
| **Priority** | P0 — **Fixed** |

### BUG-002 — LangGraph multi-agent pipeline crash

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Impact** | `AI_PIPELINE_MODE=multi-agent` throws `InvalidUpdateError` on `status` channel |
| **Root cause** | Multiple parallel edges to `merge`; each invocation wrote `status`; no reducer on `status` annotation |
| **Fix** | `mergePipelineStatus` reducer; merge/risk fan-in guards; workflow edges simplified |
| **Priority** | P0 — **Fixed** |

### BUG-003 — Stale unit test mocks for RAGContext

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Impact** | TypeScript compile failures in chat/weekly-report unit tests |
| **Root cause** | `RAGContext` gained `formattedContext`, `citations`, `tokenBudget`, etc. |
| **Fix** | `tests/helpers/rag-context.ts` |
| **Priority** | P1 — **Fixed** |

### BUG-004 — Weekly report integration false negatives

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Impact** | Tests reported 0 meetings despite seeded data |
| **Root cause** | `meetingPayload.meetingDate` (2026-06-15) outside rolling 7-day report window |
| **Fix** | Tests use `new Date().toISOString()` for meeting date |
| **Priority** | P2 — **Fixed** |

---

## Open / Known

### BUG-005 — Eval runner not implemented

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Impact** | No CI regression gate for prompt quality |
| **Root cause** | Spec-only (`eval-runner-spec.md`) |
| **Recommended fix** | Implement `npm run eval:prompts` |
| **Priority** | P1 |

### BUG-006 — persistence node sets status `running` not `completed`

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Impact** | Graph ends in `completed` via knowledge node; intermediate state confusing |
| **Recommended fix** | persistence → `completed` or omit status update |
| **Priority** | P3 |
