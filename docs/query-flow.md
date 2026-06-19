# Query Flow — MeetingMind AI

**Product:** MeetingMind AI  
**Version:** 1.0  
**Status:** Architecture — Documentation Only  
**Scope:** End-to-end path from user question to grounded AI response

---

## 1. High-Level Query Flow

```mermaid
flowchart TB
    User[User] --> FE[Frontend — React]
    FE --> API[API — Express]
    API --> Auth{Authenticated?}
    Auth -->|No| Reject[401 Unauthorized]
    Auth -->|Yes| Scope[Validate Workspace Scope]
    Scope --> Retriever[Retriever Agent]
    Retriever --> VSearch[Vector Search — pgvector]
    Retriever --> FTS[Keyword Search — FTS]
    VSearch --> Fusion[RRF Fusion]
    FTS --> Fusion
    Fusion --> CB[Context Builder Agent]
    CB --> PB[Prompt Builder Agent]
    PB --> LLM[LLM Service]
    LLM --> Provider[Model Provider]
    Provider --> Stream[SSE Stream]
    Stream --> FE
    FE --> User
```

---

## 2. Query Types

| Type | Endpoint | Scope | LLM Required |
|------|----------|-------|--------------|
| Workspace chat | `POST /workspaces/:id/chat` | All workspace meetings | ✅ |
| Meeting chat | `POST /meetings/:id/chat` | Single meeting | ✅ |
| Semantic search | `GET /workspaces/:id/search?q=` | All workspace meetings | ❌ |
| Hybrid search | `GET /workspaces/:id/search?mode=hybrid` | All workspace meetings | ❌ |

---

## 3. Workspace Chat — Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant Auth as Auth Middleware
    participant Chat as Chat Agent
    participant Ret as Retriever Agent
    participant Cache as Redis
    participant RAG as RAG Service
    participant VDB as pgvector
    participant CB as Context Builder
    participant PB as Prompt Builder
    participant LLM as LLM Service
    participant DB as PostgreSQL

    U->>FE: Type question + send
    FE->>API: POST /workspaces/:id/chat (SSE)
    API->>Auth: Validate JWT + workspace membership
    Auth-->>API: userId, workspaceId
    API->>Chat: handle(message, scope=workspace)

    Chat->>Ret: retrieve(query, workspaceId, filters)
    Ret->>Cache: GET rag:ret:{hash}
    alt Cache hit
        Cache-->>Ret: cached chunks
    else Cache miss
        Ret->>RAG: hybridSearch(query, workspaceId)
        RAG->>VDB: ANN + FTS parallel
        VDB-->>RAG: ranked chunks
        RAG-->>Ret: RetrievedChunk[]
        Ret->>Cache: SET rag:ret:{hash} TTL 15min
    end
    Ret-->>Chat: RetrievedChunk[]

    Chat->>CB: buildContext(chunks, budget=24k)
    CB-->>Chat: ContextBlock[] + citations

    Chat->>PB: buildPrompt(system, context, history, query)
    PB-->>Chat: Message[]

    Chat->>LLM: completeStream(messages, model=gpt-4o-mini)
    loop SSE tokens
        LLM-->>API: StreamChunk
        API-->>FE: event: token
        FE-->>U: Render streaming text
    end

    LLM-->>Chat: final + tokenUsage
    Chat->>DB: INSERT chat_messages (user + assistant)
    API-->>FE: event: citation + event: done
    FE-->>U: Show citations + done
```

---

## 4. Semantic Search — Flow (No LLM)

```mermaid
flowchart LR
    User[User] --> FE[Search UI]
    FE --> API[GET /search?q=]
    API --> Retriever[Retriever Agent]
    Retriever --> Embed[Query Embedding]
    Embed --> ANN[Vector ANN]
    Retriever --> FTS[FTS Query]
    ANN --> RRF[RRF Fusion]
    FTS --> RRF
    RRF --> Format[Format Results]
    Format --> FE
    FE --> User
```

**Response shape:** `{ results: [{ chunkId, meetingId, title, excerpt, similarity, sourceType }] }`

No LLM call — latency target p95 < 200ms.

---

## 5. Detailed Stage Explanations

### Stage 1: Frontend

- React Query manages chat history and optimistic UI
- SSE client (`EventSource` or `fetch` + `ReadableStream`) handles token stream
- Citation chips rendered from `event: citation` payloads
- Abort button sends `DELETE` or closes stream → `AbortController` on server

### Stage 2: API Gateway

- JWT validation via existing auth middleware
- Workspace membership check (`workspace_members` table)
- Rate limit: 30 messages/min per user
- Assign `correlationId` for tracing

### Stage 3: Retriever Agent

- Normalize query (trim, lowercase for cache key only)
- Check Redis retrieval cache
- Execute hybrid search via RAG Service
- Apply scope filters (workspace vs meeting)
- Return top-K chunks (default K=10)

### Stage 4: Vector Search

- Embed query via LLM Service (`text-embedding-3-small`)
- ANN query with `workspace_id` pre-filter
- Cosine similarity threshold ≥ 0.70
- Parallel FTS query on `search_vector` column

### Stage 5: Context Builder

- Deduplicate chunks from same `source_id`
- Sort by relevance score, then chronologically
- Fit within 24,000 token budget
- Assign `[CITATION-1]` through `[CITATION-N]` labels

### Stage 6: LLM Generation

- Model: `gpt-4o-mini` for chat (cost-optimized)
- Stream tokens via SSE
- Parse citations from response
- Log to `llm_invocations`

### Stage 7: Response Persistence

- Save user message + assistant message to `chat_messages`
- Store `citations` JSON on assistant message
- Update `chat_sessions.updated_at`

---

## 6. Meeting-Scoped Query Variant

```mermaid
flowchart TB
    Query[User Query] --> Filter["filter: meeting_id = :id"]
    Filter --> ANN[Vector Search — scoped]
    Filter --> FTS[FTS — scoped]
    ANN --> Merge[Merge Results]
    FTS --> Merge
    Merge --> Context[Context Builder]
    Context --> LLM[LLM]
```

Meeting chat adds `meeting_id` filter — prevents cross-meeting leakage even within same workspace.

---

## 7. Error Flows

```mermaid
flowchart TB
    Query[Query] --> Retrieve{Retrieval OK?}
    Retrieve -->|Vector down| FTSOnly[FTS Fallback]
    Retrieve -->|Empty results| NoContext[Respond: not found]
    Retrieve -->|OK| LLM{LLM OK?}
    FTSOnly --> LLM
    LLM -->|429| Retry[Backoff + retry]
    LLM -->|5xx| Fallback[Fallback provider]
    LLM -->|Timeout| Error[SSE event: error]
    Retry --> LLM
    Fallback --> LLM
```

| Error | User Experience | HTTP/SSE |
|-------|-----------------|----------|
| No results | "I couldn't find relevant information in your meetings." | 200 + message |
| Rate limited | "Please wait before sending another message." | 429 |
| Provider down | "AI is temporarily unavailable." | 503 |
| Token budget | "Workspace AI limit reached." | 429 |

---

## 8. Caching Strategy

```mermaid
flowchart LR
    Q[Query] --> QCache{Query embed cached?}
    QCache -->|Yes| Emb[Cached embedding]
    QCache -->|No| Gen[Generate embedding]
    Gen --> RCache{Retrieval cached?}
    Emb --> RCache
    RCache -->|Yes| Results[Return cached chunks]
    RCache -->|No| Search[Execute search]
    Search --> Store[Cache results]
```

| Cache | Key | TTL | Invalidation |
|-------|-----|-----|--------------|
| Query embedding | `rag:emb:{hash(q)}` | 1h | None |
| Retrieval | `rag:ret:{ws}:{hash(q+filters)}` | 15min | Meeting update |

---

## 9. Performance Targets

| Stage | p50 | p95 |
|-------|-----|-----|
| Auth + validation | 5ms | 20ms |
| Retrieval (cached) | 10ms | 30ms |
| Retrieval (uncached) | 80ms | 200ms |
| Context build | 5ms | 20ms |
| LLM first token | 500ms | 2s |
| Full response | 3s | 10s |

---

## 10. Security Considerations

- Workspace isolation at every stage
- Meeting chat cannot bypass `meeting_id` filter
- Chat history scoped to `chat_session_id` owned by user
- No transcript content in logs — only chunk IDs
- SSE connection requires valid JWT (no query param tokens)

---

## 11. Cost per Query

| Component | Est. Cost |
|-----------|-----------|
| Query embedding | $0.00002 |
| Retrieval | $0 (compute only) |
| Chat completion (mini) | $0.001–0.01 |
| **Total per message** | **~$0.01** |

24h retrieval cache reduces repeat query cost by ~40%.

---

## Related Documents

- [retrieval-flow.md](./retrieval-flow.md)
- [rag-architecture.md](./rag-architecture.md)
- [ai-chat-requirements.md](./ai-chat-requirements.md)
- [system-sequence-diagrams.md](./system-sequence-diagrams.md)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-18 | Initial query flow |
