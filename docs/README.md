# Documentation Index

**Products:** AI Meeting Notes & Task Manager (v0.3.0) · MeetingMind AI (LLM extension)

---

## Platform (Shipped MVP)

| Document | Description |
|----------|-------------|
| [requirements.md](./requirements.md) | Product vision, personas, RBAC |
| [functional-requirements.md](./functional-requirements.md) | FR-* requirements |
| [non-functional-requirements.md](./non-functional-requirements.md) | NFR-* requirements |
| [user-stories.md](./user-stories.md) | User stories + acceptance criteria |
| [system-architecture.md](./system-architecture.md) | Canonical system architecture |
| [database-architecture.md](./database-architecture.md) | Schema, indexes, performance |
| [erd.md](./erd.md) | Entity relationship diagram |
| [api-design.md](./api-design.md) | REST API reference |
| [security-architecture.md](./security-architecture.md) | Security controls |
| [mvp-definition.md](./mvp-definition.md) | MVP scope |
| [development-roadmap.md](./development-roadmap.md) | Original MVP phases 1–7 |

## MeetingMind AI (LLM Extension)

### Requirements

| Document | Description |
|----------|-------------|
| [future-roadmap.md](./future-roadmap.md) | **Start here** — 10-phase strategic roadmap |
| [llm-requirements.md](./llm-requirements.md) | LLM integration + meeting intelligence features |
| [rag-requirements.md](./rag-requirements.md) | RAG pipeline, chunking, retrieval |
| [vector-db-requirements.md](./vector-db-requirements.md) | pgvector selection + schema |
| [semantic-search-requirements.md](./semantic-search-requirements.md) | Hybrid semantic search |
| [ai-chat-requirements.md](./ai-chat-requirements.md) | Workspace + meeting chat |
| [multi-agent-requirements.md](./multi-agent-requirements.md) | Agent specs + orchestration |
| [observability-requirements.md](./observability-requirements.md) | Tokens, latency, cost, alerts |
| [observability-design.md](./observability-design.md) | Observability module architecture |
| [cost-analysis.md](./cost-analysis.md) | Cost tracking and optimization |
| [cache-strategy.md](./cache-strategy.md) | Cache layers and invalidation |
| [retry-strategy.md](./retry-strategy.md) | Retries, circuit breakers, fallbacks |
| [performance-optimization.md](./performance-optimization.md) | Performance analysis and SLOs |

### AI Architecture (Engineering)

| Document | Description |
|----------|-------------|
| [architecture-review-report.md](./architecture-review-report.md) | **Start here** — AI architecture review, gaps, recommendations |
| [llm-architecture.md](./llm-architecture.md) | LLM service layer, providers, streaming, fallbacks |
| [rag-architecture.md](./rag-architecture.md) | RAG pipeline, chunking, hybrid search, citations |
| [vector-db-design.md](./vector-db-design.md) | pgvector schema, indexes, scalability path |
| [agent-architecture.md](./agent-architecture.md) | 10 agents — purpose, I/O, metrics, protocol |
| [query-flow.md](./query-flow.md) | End-to-end user query → grounded answer |
| [embedding-flow.md](./embedding-flow.md) | Transcript → chunk → embed → index |
| [retrieval-flow.md](./retrieval-flow.md) | Retrieval pipeline with caching and fallbacks |
| [agent-flow.md](./agent-flow.md) | Multi-agent orchestration, parallel execution |
| [system-sequence-diagrams.md](./system-sequence-diagrams.md) | 9 system-wide Mermaid sequence diagrams |

## Architecture Reviews

| Document | Description |
|----------|-------------|
| [architecture-review.md](./architecture-review.md) | Platform architecture review |
| [api-architecture-review.md](./api-architecture-review.md) | API standards review |
| [scalability-design.md](./scalability-design.md) | Caching, queues, scale |
| [risk-assessment.md](./risk-assessment.md) | Technical risk register |

---

## Reading Order — MeetingMind AI

### Requirements

1. [future-roadmap.md](./future-roadmap.md)
2. [llm-requirements.md](./llm-requirements.md)
3. [vector-db-requirements.md](./vector-db-requirements.md) + [rag-requirements.md](./rag-requirements.md)
4. [multi-agent-requirements.md](./multi-agent-requirements.md)
5. [ai-chat-requirements.md](./ai-chat-requirements.md) + [semantic-search-requirements.md](./semantic-search-requirements.md)
6. [observability-requirements.md](./observability-requirements.md)
7. [observability-design.md](./observability-design.md) + [cost-analysis.md](./cost-analysis.md)

### Architecture (for engineering teams)

1. [architecture-review-report.md](./architecture-review-report.md) — review findings and P0 gaps
2. [llm-architecture.md](./llm-architecture.md) — LLM service layer
3. [vector-db-design.md](./vector-db-design.md) + [rag-architecture.md](./rag-architecture.md)
4. [agent-architecture.md](./agent-architecture.md) + [agent-flow.md](./agent-flow.md)
5. [embedding-flow.md](./embedding-flow.md) + [retrieval-flow.md](./retrieval-flow.md) + [query-flow.md](./query-flow.md)
6. [system-sequence-diagrams.md](./system-sequence-diagrams.md) — end-to-end sequences
