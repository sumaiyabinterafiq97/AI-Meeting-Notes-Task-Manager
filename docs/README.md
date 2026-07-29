# Documentation Index

**Product:** MeetingMind AI v0.7.2  
**Current capture flow:** Upload/record → **Translate & Transcribe** → English transcript → meeting chat  
**Primary nav:** Meetings + Settings (other surfaces soft-hidden)

---

## Start here

| Document                                                                   | Description                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [feature-inventory.md](./feature-inventory.md)                             | Implemented / partial / planned inventory              |
| [transcription-flow.md](./transcription-flow.md)                           | Upload stores only; user starts Translate & Transcribe |
| [screen-recorder.md](./screen-recorder.md)                                 | In-app tab/screen recorder (mic + tab mix)             |
| [capture-architecture.md](./capture-architecture.md)                       | Capture layer (audio, import, bots)                    |
| [google-meet-integration.md](./google-meet-integration.md)                 | Calendar + Meet links                                  |
| [api-design.md](./api-design.md)                                           | REST + SSE API reference                               |
| [system-architecture.md](./system-architecture.md)                         | Canonical system architecture                          |
| [demo/portfolio-screenshot-guide.md](./demo/portfolio-screenshot-guide.md) | Portfolio demo screenshots                             |

## Platform

| Document                                                           | Description                    |
| ------------------------------------------------------------------ | ------------------------------ |
| [requirements.md](./requirements.md)                               | Product vision, personas, RBAC |
| [functional-requirements.md](./functional-requirements.md)         | FR-\* (soft-hidden UI noted)   |
| [user-stories.md](./user-stories.md)                               | User stories + AC              |
| [mvp-definition.md](./mvp-definition.md)                           | MVP + capture → chat loop      |
| [project-scope.md](./project-scope.md)                             | In/out of scope                |
| [non-functional-requirements.md](./non-functional-requirements.md) | NFR-\*                         |
| [database-design.md](./database-design.md)                         | Prisma-synced schema summary   |
| [database-architecture.md](./database-architecture.md)             | Schema, indexes, performance   |
| [erd.md](./erd.md)                                                 | Entity relationship diagram    |
| [security-architecture.md](./security-architecture.md)             | Security controls              |
| [project-structure.md](./project-structure.md)                     | Folder conventions             |

## MeetingMind AI (LLM / RAG / agents)

| Document                                                                                                                                           | Description                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [llm-requirements.md](./llm-requirements.md) / [llm-architecture.md](./llm-architecture.md)                                                        | LLM layer                                     |
| [rag-requirements.md](./rag-requirements.md) / [rag-architecture.md](./rag-architecture.md)                                                        | RAG pipeline                                  |
| [vector-db-design.md](./vector-db-design.md)                                                                                                       | pgvector                                      |
| [ai-chat-requirements.md](./ai-chat-requirements.md)                                                                                               | Meeting chat live; workspace chat soft-hidden |
| [multi-agent-requirements.md](./multi-agent-requirements.md) / [agent-architecture.md](./agent-architecture.md) / [agent-flow.md](./agent-flow.md) | Agents                                        |
| [embedding-flow.md](./embedding-flow.md) · [retrieval-flow.md](./retrieval-flow.md)                                                                | Embedding & retrieval                         |
| [observability-requirements.md](./observability-requirements.md) / [observability-design.md](./observability-design.md)                            | Metrics & alerts                              |

## Documentation quality

| Document                                                     | Description                            |
| ------------------------------------------------------------ | -------------------------------------- |
| [documentation-audit.md](./documentation-audit.md)           | Outdated sections vs implementation    |
| [document-cleanup-report.md](./document-cleanup-report.md)   | Keep / merge / archive recommendations |
| [documentation-validation.md](./documentation-validation.md) | Post-sync validation checklist         |

---

## Reading order (capture + AI)

1. [feature-inventory.md](./feature-inventory.md)
2. [transcription-flow.md](./transcription-flow.md)
3. [capture-architecture.md](./capture-architecture.md) + [screen-recorder.md](./screen-recorder.md)
4. [system-architecture.md](./system-architecture.md)
5. [llm-architecture.md](./llm-architecture.md) → [rag-architecture.md](./rag-architecture.md) → [agent-flow.md](./agent-flow.md)
6. [api-design.md](./api-design.md) · [database-design.md](./database-design.md)
