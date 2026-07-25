# Documentation Index

**Product:** MeetingMind AI  
**Current capture flow:** Upload recording → **Translate & Transcribe** → AI pipeline

---

## Start here

| Document                                                                   | Description                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [transcription-flow.md](./transcription-flow.md)                           | Upload stores only; user starts Translate & Transcribe |
| [screen-recorder.md](./screen-recorder.md)                                 | In-app tab/screen recorder                             |
| [capture-architecture.md](./capture-architecture.md)                       | Capture layer (audio, import, bots)                    |
| [google-meet-integration.md](./google-meet-integration.md)                 | Calendar + Meet links                                  |
| [api-design.md](./api-design.md)                                           | REST API reference                                     |
| [system-architecture.md](./system-architecture.md)                         | Canonical system architecture                          |
| [demo/portfolio-screenshot-guide.md](./demo/portfolio-screenshot-guide.md) | Portfolio demo screenshots                             |

## Platform

| Document                                                           | Description                                      |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| [requirements.md](./requirements.md)                               | Product vision, personas, RBAC                   |
| [functional-requirements.md](./functional-requirements.md)         | FR-\* including capture + Translate & Transcribe |
| [user-stories.md](./user-stories.md)                               | User stories + acceptance criteria               |
| [mvp-definition.md](./mvp-definition.md)                           | MVP + current shipped capture loop               |
| [development-roadmap.md](./development-roadmap.md)                 | Phases 1–7 + Phase 8 capture                     |
| [project-scope.md](./project-scope.md)                             | In/out of scope                                  |
| [non-functional-requirements.md](./non-functional-requirements.md) | NFR-\* requirements                              |
| [database-architecture.md](./database-architecture.md)             | Schema, indexes, performance                     |
| [erd.md](./erd.md)                                                 | Entity relationship diagram                      |
| [security-architecture.md](./security-architecture.md)             | Security controls                                |
| [project-structure.md](./project-structure.md)                     | Folder conventions                               |

## MeetingMind AI (LLM / RAG / agents)

| Document                                                                                                                                                                                    | Description                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [future-roadmap.md](./future-roadmap.md)                                                                                                                                                    | Strategic roadmap                                                             |
| [meeting-import-strategy.md](./meeting-import-strategy.md)                                                                                                                                  | Zoom/Meet/Teams import adapters                                               |
| [zoom-meet-teams-integration.md](./zoom-meet-teams-integration.md)                                                                                                                          | Import vs live-bot strategy                                                   |
| [llm-requirements.md](./llm-requirements.md) / [llm-architecture.md](./llm-architecture.md)                                                                                                 | LLM layer                                                                     |
| [rag-requirements.md](./rag-requirements.md) / [rag-architecture.md](./rag-architecture.md)                                                                                                 | RAG pipeline                                                                  |
| [vector-db-requirements.md](./vector-db-requirements.md) / [vector-db-design.md](./vector-db-design.md)                                                                                     | pgvector                                                                      |
| [semantic-search-requirements.md](./semantic-search-requirements.md)                                                                                                                        | Hybrid search                                                                 |
| [ai-chat-requirements.md](./ai-chat-requirements.md)                                                                                                                                        | Workspace + meeting chat (incl. summarize/overview corpus fallback in v0.7.1) |
| [multi-agent-requirements.md](./multi-agent-requirements.md) / [agent-architecture.md](./agent-architecture.md) / [agent-flow.md](./agent-flow.md)                                          | Agents                                                                        |
| [embedding-flow.md](./embedding-flow.md) · [retrieval-flow.md](./retrieval-flow.md) · [query-flow.md](./query-flow.md)                                                                      | Flow diagrams                                                                 |
| [system-sequence-diagrams.md](./system-sequence-diagrams.md)                                                                                                                                | Mermaid sequences                                                             |
| [observability-requirements.md](./observability-requirements.md) / [observability-design.md](./observability-design.md)                                                                     | Metrics & alerts                                                              |
| [cost-analysis.md](./cost-analysis.md) · [cache-strategy.md](./cache-strategy.md) · [retry-strategy.md](./retry-strategy.md) · [performance-optimization.md](./performance-optimization.md) | Ops                                                                           |

## Reviews & debt

| Document                                                         | Description                         |
| ---------------------------------------------------------------- | ----------------------------------- |
| [architecture-review-report.md](./architecture-review-report.md) | AI architecture review              |
| [architecture-review.md](./architecture-review.md)               | Platform architecture review        |
| [api-architecture-review.md](./api-architecture-review.md)       | API standards review                |
| [scalability-design.md](./scalability-design.md)                 | Caching, queues, scale              |
| [risk-assessment.md](./risk-assessment.md)                       | Technical risk register             |
| [technical-debt.md](./technical-debt.md)                         | Open debt items                     |
| [load-test-report.md](./load-test-report.md)                     | Mock 50-concurrency meeting job run |

---

## Reading order (capture + AI)

1. [transcription-flow.md](./transcription-flow.md)
2. [capture-architecture.md](./capture-architecture.md) + [screen-recorder.md](./screen-recorder.md)
3. [llm-architecture.md](./llm-architecture.md) → [rag-architecture.md](./rag-architecture.md) → [agent-flow.md](./agent-flow.md)
4. [api-design.md](./api-design.md)
