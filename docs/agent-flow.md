# Agent Flow — MeetingMind AI

**Product:** MeetingMind AI  
**Version:** 1.0  
**Status:** Architecture — Documentation Only  
**Scope:** Multi-agent orchestration from meeting transcript to knowledge base and user-facing agents

---

## 1. Master Agent Pipeline

```mermaid
flowchart TB
    MTG[Meeting Transcript] --> Orch[Agent Orchestrator]
    Orch --> Mode{AI_PIPELINE_MODE}

    Mode -->|monolithic| Mono[Single LLM Extract]
    Mode -->|multi-agent| Parallel[Parallel Phase 1]

    subgraph Phase1["Phase 1 — Parallel Extraction"]
        Parallel --> SA[Summarizer Agent]
        Parallel --> TA[Task Extraction Agent]
        Parallel --> DA[Decision Agent]
        Parallel --> RA[Risk Analyzer Agent]
    end

    SA & TA & DA & RA --> Merge[Output Merger]
    Mono --> Persist

    Merge --> Persist[Persist meeting_ai_outputs]
    Persist --> KA[Knowledge Agent]
    KA --> KB[(Knowledge Base)]
    KA --> Embed[Enqueue embed-meeting]

    Embed --> VDB[(Vector Index)]

    subgraph Scheduled["Scheduled Agents"]
        WRA[Weekly Report Agent]
    end

    WRA --> RetA[Retriever Agent]
    RetA --> VDB
    WRA --> Report[(workspace_reports)]

    subgraph Interactive["Interactive Agents"]
        ChatA[Chat Agent]
    end

    ChatA --> RetA2[Retriever Agent]
    RetA2 --> VDB
    ChatA --> CBA[Context Builder Agent]
    CBA --> PBA[Prompt Builder Agent]
    PBA --> LLM[LLM Service]
```

---

## 2. Execution Order & Dependencies

```mermaid
gantt
    title Meeting Processing Agent Timeline
    dateFormat X
    axisFormat %s

    section Parallel
    Summarizer Agent       :sa, 0, 30
    Task Extraction Agent  :ta, 0, 25
    Decision Agent         :da, 0, 20
    Risk Analyzer Agent    :ra, 0, 22

    section Sequential
    Output Merger          :merge, after sa, 5
    Persist AI Outputs     :persist, after merge, 3
    Knowledge Agent        :ka, after persist, 15
    Embed Meeting Job      :embed, after ka, 20
```

| Step | Agent | Depends On | Parallel? |
|------|-------|------------|-----------|
| 1 | Summarizer | transcript | ✅ With 2–4 |
| 2 | Task Extraction | transcript | ✅ With 1,3,4 |
| 3 | Decision | transcript | ✅ With 1,2,4 |
| 4 | Risk Analyzer | transcript | ✅ With 1,2,3 |
| 5 | Output Merger | 1–4 complete | ❌ Sequential |
| 6 | Persist | Merger output | ❌ Sequential |
| 7 | Knowledge Agent | Persisted outputs | ❌ Sequential |
| 8 | embed-meeting | Knowledge complete | ❌ Async job |
| 9 | Weekly Report | Vector index | ❌ Scheduled |
| 10 | Chat | Vector index | ❌ On-demand |

---

## 3. Parallel Execution Architecture

```mermaid
sequenceDiagram
    autonumber
    participant Queue as BullMQ
    participant Orch as Orchestrator
    participant SA as Summarizer
    participant TA as Task Agent
    participant DA as Decision
    participant RA as Risk
    participant Merger
    participant DB as PostgreSQL
    participant KA as Knowledge Agent
    participant EmbedQ as embed-meeting Queue

    Queue->>Orch: process-meeting job
    Orch->>Orch: load transcript + context

    par Parallel extraction (max 4)
        Orch->>SA: execute(transcript)
        Orch->>TA: execute(transcript)
        Orch->>DA: execute(transcript)
        Orch->>RA: execute(transcript)
    end

    SA-->>Orch: summary + topics
    TA-->>Orch: actionItems[]
    DA-->>Orch: decisions[]
    RA-->>Orch: risks[]

    Orch->>Merger: merge(agentResults)
    Merger-->>Orch: MeetingAIOutput

    Orch->>DB: UPSERT meeting_ai_outputs
    Orch->>DB: INSERT action_item_suggestions

    Orch->>KA: execute(mergedOutput, transcript)
    KA->>DB: UPSERT knowledge_entries
    KA->>EmbedQ: enqueue embed-meeting

    Orch->>DB: UPDATE ai_processing_jobs status=completed
```

---

## 4. Failure Handling

```mermaid
flowchart TB
    Agent[Any Agent Execution] --> Result{Result?}
    Result -->|Success| Next[Continue Pipeline]
    Result -->|Retryable Error| Retry{Retries < 2?}
    Retry -->|Yes| Backoff[Exponential Backoff]
    Backoff --> Agent
    Retry -->|No| Partial[Mark Agent Failed]
    Result -->|Fatal Error| Partial
    Partial --> Check{Critical agent?}
    Check -->|Summarizer failed| Fail[Fail entire pipeline]
    Check -->|Non-critical failed| Degrade[Continue with partial output]
    Degrade --> Next
    Fail --> DLQ[Dead Letter Queue + Alert]
```

| Agent | Critical? | Partial Failure Behavior |
|-------|-----------|--------------------------|
| Summarizer | ✅ Yes | Pipeline fails; user notified |
| Task Extraction | ⚠️ Medium | Continue; empty action items |
| Decision | ❌ No | Continue; empty decisions |
| Risk Analyzer | ❌ No | Continue; empty risks |
| Knowledge Agent | ❌ No | Skip KB update; embed still runs |
| Retriever | ⚠️ Medium | FTS fallback |
| Chat Agent | ✅ Yes | User error message |

### Retry Policy

| Parameter | Value |
|-----------|-------|
| Max retries per agent | 2 |
| Backoff | 2s, 4s |
| Retryable errors | 429, 5xx, timeout |
| Non-retryable | 400, validation error |
| Pipeline timeout | 300s |

---

## 5. Monolithic Fallback Flow

```mermaid
flowchart LR
    Transcript[Transcript] --> Mono[Single LLM Call]
    Mono --> Schema[MeetingExtractionSchema]
    Schema --> Persist[meeting_ai_outputs]
    Persist --> Embed[embed-meeting]
```

**When `AI_PIPELINE_MODE=monolithic`:**
- Skip parallel agents
- Use existing v0.3.0 extraction prompt
- Same output schema — zero migration risk
- Feature flag allows instant rollback

---

## 6. Knowledge Agent Flow

```mermaid
sequenceDiagram
    participant Orch as Orchestrator
    participant KA as Knowledge Agent
    participant LLM as LLM Service
    participant DB as PostgreSQL
    participant RAG as RAG Service
    participant Queue as embed-meeting

    Orch->>KA: mergedOutput + transcript
    KA->>LLM: extract knowledge entities
    LLM-->>KA: KnowledgeEntity[]

    loop Each entity
        KA->>RAG: similaritySearch(entity, threshold=0.92)
        RAG-->>KA: existing matches
        alt Duplicate found
            KA->>DB: MERGE knowledge_entry
        else New entity
            KA->>DB: INSERT knowledge_entry
        end
    end

    KA->>Queue: enqueue embed-meeting
```

---

## 7. Weekly Report Agent Flow

```mermaid
flowchart TB
    Cron[Weekly Cron — Monday 6am] --> WRA[Weekly Report Agent]
    WRA --> Ret[Retriever Agent]
    Ret --> VDB[(Vector DB)]
    Ret --> Chunks[Last 7 days chunks]
    Chunks --> WRA
    WRA --> LLM[LLM Service — gpt-4o]
    LLM --> Report[WeeklyReport JSON]
    Report --> DB[(workspace_reports)]
    DB --> Notify[Notification — optional]
```

| Input | Value |
|-------|-------|
| Date range | Last 7 days |
| Retrieval query | "weekly summary decisions risks tasks" |
| Top-K chunks | 30 |
| Model | `gpt-4o` (higher quality for reports) |

---

## 8. Chat Agent Flow

```mermaid
sequenceDiagram
    participant User
    participant Chat as Chat Agent
    participant Ret as Retriever Agent
    participant CB as Context Builder
    participant PB as Prompt Builder
    participant LLM as LLM Service

    User->>Chat: message
    Chat->>Ret: retrieve(query, scope)
    Ret-->>Chat: chunks[]

    alt No chunks above threshold
        Chat-->>User: "Not found in your meetings"
    else
        Chat->>CB: buildContext(chunks)
        CB-->>Chat: contextBlocks
        Chat->>PB: buildPrompt(context, history, query)
        PB-->>Chat: messages[]
        Chat->>LLM: completeStream(messages)
        loop SSE
            LLM-->>Chat: tokens
            Chat-->>User: stream
        end
    end
```

---

## 9. RAG Sub-Agent Chain

```mermaid
flowchart LR
    Query[User Query] --> RetA[Retriever Agent]
    RetA --> CBA[Context Builder Agent]
    CBA --> PBA[Prompt Builder Agent]
    PBA --> LLM[LLM Service]
    LLM --> Response[Answer]
```

**Latency budget:**
- Retriever: 200ms
- Context Builder: 20ms
- Prompt Builder: 10ms
- LLM first token: 500ms

---

## 10. Future LangGraph Support

```mermaid
stateDiagram-v2
    [*] --> IngestTranscript
    IngestTranscript --> ParallelExtract

    state ParallelExtract {
        [*] --> Summarizer
        [*] --> TaskExtraction
        [*] --> Decision
        [*] --> RiskAnalyzer
        Summarizer --> [*]
        TaskExtraction --> [*]
        Decision --> [*]
        RiskAnalyzer --> [*]
    }

    ParallelExtract --> MergeOutputs
    MergeOutputs --> PersistOutputs
    PersistOutputs --> KnowledgeExtract
    KnowledgeExtract --> EmbedVectors
    EmbedVectors --> [*]
```

### LangGraph Migration Path

| Current | LangGraph Equivalent |
|---------|---------------------|
| Agent Orchestrator | `StateGraph` |
| Agent message envelope | Graph state schema |
| `agent_executions` table | Checkpoint store |
| BullMQ job | Graph invocation trigger |
| Parallel fan-out | `add_edge` from START to multiple nodes |
| Merge node | Reducer function on state |
| Feature flag | Graph selector at runtime |

**Design principles for compatibility:**
1. Each agent is a pure `async function(state) → partialState`
2. No agent calls another agent directly — only via orchestrator/graph edges
3. State schema is versioned and JSON-serializable
4. BullMQ remains the job trigger; LangGraph runs inside worker

---

## 11. Agent State Schema (Conceptual)

```typescript
interface PipelineState {
  correlationId: string;
  workspaceId: string;
  meetingId: string;
  transcript: string;
  memberNames: string[];
  agentResults: {
    summarizer?: SummaryOutput;
    taskExtraction?: ActionItem[];
    decision?: Decision[];
    risk?: Risk[];
    knowledge?: KnowledgeEntry[];
  };
  status: 'running' | 'completed' | 'partial' | 'failed';
  errors: AgentError[];
  metrics: {
    startedAt: string;
    completedAt?: string;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}
```

---

## 12. Observability Flow

```mermaid
flowchart LR
    Agent[Any Agent] --> ExecLog[(agent_executions)]
    Agent --> LLMLog[(llm_invocations)]
    ExecLog --> Trace[Distributed Trace]
    LLMLog --> Trace
    Trace --> Dashboard[Grafana / Admin UI]
```

Every agent execution records:
- `agentType`, `status`, `latencyMs`
- `promptTokens`, `completionTokens`, `model`
- `correlationId` linking to parent job

---

## 13. Scalability

| Scale | Strategy |
|-------|----------|
| 1–10 concurrent pipelines | Single worker, concurrency=3 |
| 10–50 concurrent | 3 worker replicas |
| 50+ concurrent | Dedicated extraction worker pool |
| Chat agents | Stateless API horizontal scaling |
| Weekly reports | Low-priority queue; off-peak scheduling |

---

## Related Documents

- [agent-architecture.md](./agent-architecture.md)
- [llm-architecture.md](./llm-architecture.md)
- [embedding-flow.md](./embedding-flow.md)
- [multi-agent-requirements.md](./multi-agent-requirements.md)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-18 | Initial agent flow |
