# Technical Debt — MeetingMind AI

**Date:** 2026-06-22  
**Source:** Architecture review + QA validation

---

## P0 — Pre-Production

| ID | Area | Debt | Impact |
|----|------|------|--------|
| TD-002 | Load | Chat load test (k6) not in repo | Unknown chat P95 under load |
| TD-003 | E2E | No Playwright suite | UI regressions undetected |

---

## P1 — Post-GA

| ID | Area | Debt | Impact |
|----|------|------|--------|
| TD-004 | RAG | No cross-encoder reranker | Recall quality ceiling |
| TD-005 | Storage | Transcripts in PostgreSQL TEXT | DB bloat at 10k+ meetings |
| TD-006 | JWT | HS256 only | Multi-service token verification |
| TD-007 | Workers | Single worker process default | AI backlog under load |
| TD-008 | Chat | `CHAT_TOOLS_ENABLED=false` | Limited agentic capabilities |

---

## P2 — Future

| ID | Area | Debt |
|----|------|------|
| TD-009 | Vectors | Pinecone escape hatch not built |
| TD-010 | Email alerts | `ALERT_EMAIL_TO` stub |
| TD-011 | OpenTelemetry | Distributed tracing not wired |
| TD-012 | Object storage | Audio/transcript S3 migration |

---

## Recently Retired

| ID | Was | Resolved |
|----|-----|----------|
| — | RRF threshold bug | BUG-001 fixed 2026-06-22 |
| — | LangGraph status conflict | BUG-002 fixed 2026-06-22 |
| — | Eval runner missing | `npm run eval:prompts` shipped 2026-06-22 |
| — | Meeting load test script | `npm run load:test:meetings` shipped 2026-06-22 |
| — | Prompts inline in code | Migrated to `backend/prompts/` |
| — | No LLM abstraction | `LLMService` + providers shipped |

---

## Debt Ratio Estimate

~15% of MeetingMind AI roadmap (phases 1–5) complete per architecture-review-report.md gap analysis. Platform MVP (v0.3.0) remains solid foundation.
