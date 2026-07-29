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
| [project-scope.md](./project-scope.md)                             | In/out of scope                                  |
| [non-functional-requirements.md](./non-functional-requirements.md) | NFR-\* requirements                              |
| [database-architecture.md](./database-architecture.md)             | Schema, indexes, performance                     |
| [erd.md](./erd.md)                                                 | Entity relationship diagram                      |
| [security-architecture.md](./security-architecture.md)             | Security controls                                |
| [project-structure.md](./project-structure.md)                     | Folder conventions                               |

## MeetingMind AI (LLM / RAG / agents)

| Document                                                                                                                                           | Description                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [llm-requirements.md](./llm-requirements.md) / [llm-architecture.md](./llm-architecture.md)                                                        | LLM layer                                                               |
| [rag-requirements.md](./rag-requirements.md) / [rag-architecture.md](./rag-architecture.md)                                                        | RAG pipeline                                                            |
| [vector-db-design.md](./vector-db-design.md)                                                                                                       | pgvector                                                                |
| [ai-chat-requirements.md](./ai-chat-requirements.md)                                                                                               | Workspace + meeting chat (summarize/overview corpus fallback in v0.7.1) |
| [multi-agent-requirements.md](./multi-agent-requirements.md) / [agent-architecture.md](./agent-architecture.md) / [agent-flow.md](./agent-flow.md) | Agents                                                                  |
| [embedding-flow.md](./embedding-flow.md) · [retrieval-flow.md](./retrieval-flow.md)                                                                | Embedding & retrieval flows                                             |
| [observability-requirements.md](./observability-requirements.md) / [observability-design.md](./observability-design.md)                            | Metrics & alerts                                                        |

---

## Reading order (capture + AI)

1. [transcription-flow.md](./transcription-flow.md)
2. [capture-architecture.md](./capture-architecture.md) + [screen-recorder.md](./screen-recorder.md)
3. [llm-architecture.md](./llm-architecture.md) → [rag-architecture.md](./rag-architecture.md) → [agent-flow.md](./agent-flow.md)
4. [api-design.md](./api-design.md)
