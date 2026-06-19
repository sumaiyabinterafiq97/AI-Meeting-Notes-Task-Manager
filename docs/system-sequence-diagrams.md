# System Sequence Diagrams — MeetingMind AI

**Product:** MeetingMind AI  
**Version:** 1.0  
**Status:** Architecture — Documentation Only  
**Scope:** End-to-end system sequences across platform and AI subsystems

---

## 1. Login Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as React Frontend
    participant API as Express API
    participant Auth as Auth Service
    participant DB as PostgreSQL
    participant Redis as Redis

    U->>FE: Enter email + password
    FE->>API: POST /auth/login
    API->>Auth: validateCredentials(email, password)
    Auth->>DB: SELECT user WHERE email
    DB-->>Auth: user record
    Auth->>Auth: bcrypt.compare(password, hash)

    alt Invalid credentials
        Auth-->>API: 401 Unauthorized
        API-->>FE: Error message
    else Valid
        Auth->>Auth: generateAccessToken (15min)
        Auth->>Auth: generateRefreshToken
        Auth->>DB: INSERT refresh_tokens (hash)
        Auth-->>API: { accessToken, refreshToken, user }
        API-->>FE: 200 OK + tokens
        FE->>FE: Store accessToken in memory
        FE->>FE: Store refreshToken in httpOnly cookie
        FE->>API: GET /workspaces (Bearer token)
        API->>DB: SELECT workspaces for user
        DB-->>API: workspace list
        API-->>FE: workspaces[]
        FE-->>U: Redirect to dashboard
    end
```

---

## 2. Meeting Upload Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as API
    participant Auth as Auth Middleware
    participant MTG as Meeting Service
    participant DB as PostgreSQL
    participant Queue as BullMQ

    U->>FE: Upload transcript file + metadata
    FE->>FE: Validate file (size, format)
    FE->>API: POST /workspaces/:id/meetings (multipart)
    API->>Auth: Verify JWT + workspace membership
    Auth-->>API: userId, role

    API->>MTG: createMeeting(data, transcript)
    MTG->>DB: INSERT meetings (status=processing)
    MTG->>DB: Store transcript TEXT
    MTG->>Queue: enqueue process-meeting job
    MTG-->>API: meeting record
    API-->>FE: 201 Created { meetingId, status: processing }
    FE-->>U: Show "Processing..." indicator

    Note over FE,Queue: Polling or WebSocket for status updates
    FE->>API: GET /meetings/:id (poll every 5s)
    API->>DB: SELECT meeting + ai_processing_jobs
    DB-->>API: status
    API-->>FE: { status: processing | completed | failed }
```

---

## 3. Transcript Processing Flow

```mermaid
sequenceDiagram
    autonumber
    participant Queue as BullMQ
    participant Worker as AI Worker
    participant Orch as Agent Orchestrator
    participant LLM as LLM Service
    participant DB as PostgreSQL
    participant Notify as Notification Service

    Queue->>Worker: process-meeting job
    Worker->>DB: UPDATE ai_processing_jobs (status=running)
    Worker->>DB: SELECT transcript, members, meeting metadata
    DB-->>Worker: meeting context

    Worker->>Orch: executePipeline(transcript, context)

    alt AI_PIPELINE_MODE=monolithic
        Orch->>LLM: complete(extractionPrompt, schema)
        LLM-->>Orch: MeetingExtractionOutput
    else AI_PIPELINE_MODE=multi-agent
        par Parallel agents
            Orch->>LLM: Summarizer Agent
            Orch->>LLM: Task Extraction Agent
            Orch->>LLM: Decision Agent
            Orch->>LLM: Risk Analyzer Agent
        end
        LLM-->>Orch: agent results[]
        Orch->>Orch: merge outputs
    end

    Orch->>DB: UPSERT meeting_ai_outputs
    Orch->>DB: INSERT action_item_suggestions
    Orch->>DB: INSERT agent_executions (per agent)
    Orch->>DB: INSERT llm_invocations

    Worker->>Queue: enqueue embed-meeting
    Worker->>DB: UPDATE meetings (status=completed)
    Worker->>DB: UPDATE ai_processing_jobs (status=completed)
    Worker->>Notify: createNotification(meeting processed)
```

---

## 4. Embedding Generation Flow

```mermaid
sequenceDiagram
    autonumber
    participant Queue as BullMQ
    participant Worker as Embed Worker
    participant Chunker as Chunking Service
    participant LLM as LLM Service
    participant DB as PostgreSQL
    participant Cache as Redis

    Queue->>Worker: embed-meeting job
    Worker->>DB: INSERT embedding_jobs (status=running)
    Worker->>DB: SELECT transcript + meeting_ai_outputs

    Worker->>Chunker: chunk(sources[])
    Chunker-->>Worker: Chunk[] (e.g. 75)

    loop Batches of 100
        Worker->>Cache: check embedding cache
        Worker->>LLM: embed(uncachedTexts[])
        LLM-->>Worker: vectors[]
        Worker->>Cache: store embeddings TTL 7d
        Worker->>DB: UPSERT document_chunks
    end

    Worker->>DB: UPDATE embedding_jobs (status=completed)
    Worker->>Cache: DEL rag:ret:{workspaceId}:*
```

---

## 5. AI Chat Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (SSE Client)
    participant API as API
    participant Chat as Chat Agent
    participant Ret as Retriever Agent
    participant RAG as RAG Service
    participant VDB as pgvector
    participant CB as Context Builder
    participant PB as Prompt Builder
    participant LLM as LLM Service
    participant DB as PostgreSQL

    U->>FE: Type message + send
    FE->>API: POST /workspaces/:id/chat (Accept: text/event-stream)

    API->>DB: INSERT chat_messages (role=user)
    API->>Chat: handle(message, sessionId, scope)

    Chat->>Ret: retrieve(query, workspaceId, filters)
    Ret->>RAG: hybridSearch(query)
    par Vector + FTS
        RAG->>VDB: ANN search
        RAG->>VDB: FTS search
    end
    VDB-->>RAG: results
    RAG-->>Ret: RetrievedChunk[]
    Ret-->>Chat: chunks

    Chat->>CB: buildContext(chunks, budget=24k)
    CB-->>Chat: ContextBlock[]

    Chat->>PB: buildPrompt(system, context, history, query)
    PB-->>Chat: Message[]

    Chat->>LLM: completeStream(messages, gpt-4o-mini)

    loop SSE stream
        LLM-->>API: token chunk
        API-->>FE: event: token
        FE-->>U: Render streaming text
    end

    LLM-->>Chat: complete + citations
    API-->>FE: event: citation (per source)
    Chat->>DB: INSERT chat_messages (role=assistant, citations)
    API-->>FE: event: done { messageId, tokenUsage }
    FE-->>U: Show citations
```

---

## 6. Task Extraction Flow

```mermaid
sequenceDiagram
    autonumber
    participant Orch as Orchestrator
    participant TA as Task Extraction Agent
    participant LLM as LLM Service
    participant Member as Member Service
    participant DB as PostgreSQL
    participant U as User (later)

    Orch->>TA: execute(transcript, memberNames)
    TA->>Member: resolveMemberNames(names)
    Member-->>TA: Member[] with IDs

    TA->>LLM: complete(taskExtractionPrompt, ActionItemSchema)
    LLM-->>TA: ActionItem[]

    TA->>TA: map assignees to member IDs
    TA->>TA: validate schema + confidence scores
    TA-->>Orch: AgentResult<ActionItem[]>

    Orch->>DB: INSERT action_item_suggestions (status=pending)

    Note over U,DB: Human-in-the-loop review
    U->>DB: PATCH /action-items/:id/accept
    DB->>DB: INSERT tasks (from accepted suggestion)
    DB->>DB: UPDATE action_item_suggestions (status=accepted)
```

---

## 7. Weekly Report Flow

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Scheduler (Monday 6am)
    participant Queue as BullMQ
    participant WRA as Weekly Report Agent
    participant Ret as Retriever Agent
    participant RAG as RAG Service
    participant VDB as pgvector
    participant LLM as LLM Service
    participant DB as PostgreSQL
    participant Notify as Notification Service

    Cron->>Queue: enqueue weekly-report per workspace
    Queue->>WRA: job { workspaceId, dateRange: last7days }

    WRA->>Ret: retrieve("weekly summary decisions risks tasks", workspaceId, dateFilter)
    Ret->>RAG: hybridSearch with date_range filter
    RAG->>VDB: ANN + FTS (last 7 days)
    VDB-->>RAG: chunks[]
    RAG-->>Ret: RetrievedChunk[]
    Ret-->>WRA: context chunks

    WRA->>DB: SELECT task stats, meeting count
    WRA->>LLM: complete(weeklyReportPrompt, WeeklyReportSchema)
    LLM-->>WRA: WeeklyReport

    WRA->>DB: INSERT workspace_reports
    WRA->>Notify: optional notification to workspace admins
```

---

## 8. Knowledge Retrieval Flow

```mermaid
sequenceDiagram
    autonumber
    participant Chat as Chat Agent
    participant Ret as Retriever Agent
    participant Cache as Redis
    participant RAG as RAG Service
    participant VDB as pgvector
    participant KB as knowledge_entries

    Chat->>Ret: retrieve(query, workspaceId)

    Ret->>Cache: GET rag:ret:{ws}:{hash}
    alt Cache hit
        Cache-->>Ret: cached chunks
    else Cache miss
        Ret->>RAG: hybridSearch(query, { source_types: [transcript, summary, decision, knowledge] })
        par Search paths
            RAG->>VDB: ANN(queryVector, workspaceId)
            RAG->>VDB: FTS(query, workspaceId)
        end
        VDB-->>RAG: vector + keyword results
        RAG->>RAG: RRF fusion + rank
        RAG->>KB: enrich with knowledge metadata
        KB-->>RAG: entity relationships
        RAG-->>Ret: ranked chunks
        Ret->>Cache: SET rag:ret TTL 15min
    end

    Ret-->>Chat: RetrievedChunk[] with citations
```

---

## 9. Semantic Search Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Search UI
    participant API as API
    participant Ret as Retriever Agent
    participant LLM as LLM Service
    participant VDB as pgvector
    participant DB as PostgreSQL

    U->>FE: Enter search query + select mode
    FE->>API: GET /workspaces/:id/search?q=&mode=hybrid

    API->>Ret: search(query, workspaceId, mode, filters)

    alt mode=semantic
        Ret->>LLM: embed(query)
        LLM-->>Ret: queryVector
        Ret->>VDB: ANN search only
    else mode=keyword
        Ret->>VDB: FTS only
    else mode=hybrid
        Ret->>LLM: embed(query)
        LLM-->>Ret: queryVector
        par Parallel
            Ret->>VDB: ANN search
            Ret->>VDB: FTS search
        end
        Ret->>Ret: RRF fusion
    end

    VDB-->>Ret: ranked chunks
    Ret->>DB: JOIN meetings for title, date
    DB-->>Ret: enriched results
    Ret-->>API: SearchResult[]
    API-->>FE: { results[], total, mode }
    FE-->>U: Display results with meeting links
```

---

## 10. System Context — All Flows

```mermaid
flowchart TB
    subgraph Client["Client Tier"]
        Browser[React SPA]
    end

    subgraph API["API Tier — Railway"]
        Express[Express API]
        SSE[SSE Handler]
    end

    subgraph Workers["Worker Tier — Railway"]
        ProcWorker[process-meeting]
        EmbedWorker[embed-meeting]
        ReportWorker[weekly-report]
    end

    subgraph AI["AI Tier"]
        Orch[Agent Orchestrator]
        LLM[LLM Service]
        RAG[RAG Service]
    end

    subgraph Data["Data Tier"]
        PG[(Neon PostgreSQL + pgvector)]
        Redis[(Upstash Redis)]
        Queue[BullMQ]
    end

    subgraph External["External"]
        OpenAI[OpenAI API]
        Claude[Anthropic]
        Gemini[Google AI]
    end

    Browser --> Express
    Browser --> SSE
    Express --> Orch
    Express --> RAG
    Express --> PG
    Express --> Queue
    Express --> Redis
    Queue --> ProcWorker & EmbedWorker & ReportWorker
    ProcWorker --> Orch
    EmbedWorker --> RAG
    ReportWorker --> RAG
    Orch --> LLM
    RAG --> LLM
    RAG --> PG
    LLM --> OpenAI & Claude & Gemini
    ProcWorker & EmbedWorker --> PG
```

---

## 11. Cross-Cutting Concerns

### Correlation ID Propagation

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as API
    participant Queue as BullMQ
    participant Worker as Worker
    participant LLM as LLM Service

    FE->>API: X-Request-Id: uuid
    API->>API: correlationId = uuid
    API->>Queue: job.data.correlationId
    Queue->>Worker: job
    Worker->>LLM: metadata.correlationId
    LLM->>LLM: log llm_invocations.correlation_id
```

### Authentication on All Flows

Every sequence includes:
1. JWT validation (access token in `Authorization` header)
2. Workspace membership check
3. Role-based authorization (admin for reindex, member for chat)

---

## Related Documents

- [query-flow.md](./query-flow.md)
- [agent-flow.md](./agent-flow.md)
- [embedding-flow.md](./embedding-flow.md)
- [retrieval-flow.md](./retrieval-flow.md)
- [system-architecture.md](./system-architecture.md)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-18 | Initial system sequence diagrams — 9 flows |
