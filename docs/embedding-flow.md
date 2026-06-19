# Embedding Flow — MeetingMind AI

**Product:** MeetingMind AI  
**Version:** 1.0  
**Status:** Architecture — Documentation Only  
**Scope:** Transcript ingestion through vector indexing

---

## 1. Primary Embedding Pipeline

```mermaid
flowchart TB
    Transcript[Meeting Transcript] --> Trigger{Trigger Event}
    Trigger -->|AI processing complete| Job[embed-meeting Job]
    Trigger -->|Manual reindex| Job
    Trigger -->|Transcript edit| Reindex[Reindex Flow]

    Job --> Load[Load transcript + AI outputs]
    Load --> Chunk[Chunking Service]
    Chunk --> Meta[Metadata Extraction]
    Meta --> Batch[Batch Embedding — 100 chunks]
    Batch --> LLM[LLM Service — embed]
    LLM --> Store[Vector Storage — document_chunks]
    Store --> Index[HNSW Index — automatic]
    Index --> Status[Update embedding_jobs status]
    Status --> Cache[Invalidate retrieval cache]
```

---

## 2. Chunking Detail

```mermaid
flowchart LR
    subgraph Sources["Chunk Sources"]
        T[Transcript paragraphs]
        S[Summary sections]
        D[Decisions]
        A[Action items]
        K[Knowledge entries]
    end

    subgraph Process["Chunking"]
        Clean[Clean + normalize]
        Split[Split by token limit]
        Overlap[Apply overlap — transcript only]
        Enrich[Attach metadata]
    end

    T --> Clean
    S & D & A & K --> Enrich
    Clean --> Split --> Overlap --> Enrich
    Enrich --> Chunks[Chunk[]]
```

| Source | Chunks per Meeting (avg) | Token Size |
|--------|--------------------------|------------|
| Transcript (60 min) | 40–80 | 512 |
| Summary | 3–5 | Full section |
| Decisions | 2–10 | Variable |
| Action items | 5–15 | Variable |
| **Total** | **~50–110** | |

---

## 3. Embedding Generation Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Worker as embed-meeting Worker
    participant DB as PostgreSQL
    participant Chunker as Chunking Service
    participant LLM as LLM Service
    participant Cache as Redis
    participant VDB as document_chunks

    Worker->>DB: SELECT transcript, ai_outputs WHERE meeting_id
    DB-->>Worker: meeting data
    Worker->>DB: INSERT embedding_jobs (status=running)

    Worker->>Chunker: chunk(transcript, ai_outputs)
    Chunker-->>Worker: Chunk[] (e.g. 75 chunks)

    loop Batch of 100
        Worker->>Cache: MGET emb:{hash(chunk.content)}
        Cache-->>Worker: cached vectors (partial)
        Worker->>LLM: embed(uncachedTexts[])
        LLM-->>Worker: vectors[]
        Worker->>Cache: MSET emb:{hash} TTL 7d
        Worker->>VDB: UPSERT document_chunks
    end

    Worker->>DB: UPDATE embedding_jobs (status=completed)
    Worker->>Cache: DEL rag:ret:{workspaceId}:*
```

---

## 4. Metadata Extraction

| Field | Source | Extraction Method |
|-------|--------|-------------------|
| `workspace_id` | `meetings.workspace_id` | Direct |
| `meeting_id` | `meetings.id` | Direct |
| `source_type` | Chunk origin | Chunker assignment |
| `source_id` | meeting_id or entity id | Chunker assignment |
| `speaker` | VTT `[Speaker]` tags | Regex parser |
| `timestamp_start` | VTT timestamps | Regex parser |
| `meeting_title` | `meetings.title` | Join |
| `meeting_date` | `meetings.scheduled_at` | Join |
| `token_count` | Chunk content | tiktoken count |
| `embedding_model` | Config | `EMBEDDING_MODEL` env |

---

## 5. Vector Storage

```mermaid
flowchart TB
    Chunk[Chunk + Vector] --> Upsert{Existing chunk?}
    Upsert -->|source_id + chunk_index match| Update[UPDATE embedding + content]
    Upsert -->|New| Insert[INSERT row]
    Update --> Index[HNSW auto-indexed]
    Insert --> Index
```

**UPSERT key:** `(workspace_id, source_type, source_id, chunk_index)`

---

## 6. Update Flow

Triggered when: transcript edited, AI outputs regenerated, meeting metadata changed.

```mermaid
sequenceDiagram
    participant API
    participant Queue as BullMQ
    participant Worker
    participant DB

    API->>DB: UPDATE meetings.transcript
    API->>Queue: enqueue embed-meeting (priority=high)
    Queue->>Worker: job
    Worker->>DB: DELETE document_chunks WHERE meeting_id
    Worker->>Worker: Full re-chunk + re-embed
    Worker->>DB: UPSERT new chunks
    Worker->>DB: UPDATE embedding_jobs
```

**Rule:** Always delete-then-insert for meeting updates — avoids stale chunk orphans.

---

## 7. Reindex Flow

Triggered when: embedding model change, bulk workspace migration, index corruption.

```mermaid
flowchart TB
    Admin[Admin / Cron Trigger] --> Scope{Scope}
    Scope -->|Workspace| WSJob[reindex-workspace job]
    Scope -->|Meeting| MTGJob[embed-meeting job]
    Scope -->|Platform| PlatformJob[reindex-all — batched]

    WSJob --> Batch[Process meetings in batches of 50]
    PlatformJob --> Batch
    Batch --> Embed[embed-meeting per meeting]
    Embed --> Progress[Update reindex progress]
    Progress --> Done{More meetings?}
    Done -->|Yes| Batch
    Done -->|No| Complete[Mark reindex complete]
```

| Reindex Type | Trigger | Concurrency | Est. Duration |
|--------------|---------|-------------|---------------|
| Single meeting | Transcript edit | 1 | < 30s |
| Workspace | Model upgrade | 5 parallel | ~1h per 1000 meetings |
| Platform | Admin command | 10 parallel | ~24h per 10k meetings |

---

## 8. Deletion Flow

```mermaid
sequenceDiagram
    participant API
    participant DB
    participant Cache as Redis

    API->>DB: DELETE meeting (CASCADE)
    DB->>DB: CASCADE DELETE document_chunks
    DB->>DB: DELETE embedding_jobs
    API->>Cache: DEL rag:ret:{workspaceId}:*
```

| Event | Chunks Affected | Cache Action |
|-------|-----------------|--------------|
| Meeting deleted | CASCADE DELETE all meeting chunks | Invalidate workspace retrieval cache |
| Workspace deleted | CASCADE DELETE all chunks | Invalidate all workspace caches |
| Knowledge entry deleted | DELETE chunks WHERE source_id | Invalidate workspace cache |
| AI output regenerated | DELETE + re-insert summary/decision chunks | Invalidate meeting cache |

---

## 9. Batch Processing

```mermaid
flowchart TB
    subgraph WorkerPool["Embedding Workers — scale 1–5"]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker N]
    end

    Queue[BullMQ — embed-meeting queue] --> W1 & W2 & W3
    W1 & W2 & W3 --> Batch[Batch 100 texts per API call]
    Batch --> OpenAI[OpenAI Embeddings API]
    OpenAI --> Store[(document_chunks)]
```

| Parameter | Value |
|-----------|-------|
| Batch size | 100 chunks |
| Worker concurrency | 3 per worker process |
| Queue priority | High: user-triggered; Normal: post-process; Low: reindex |
| Retry | 3 attempts; exponential backoff |
| Dead letter | After 3 failures → `embedding_jobs.status=failed` |

---

## 10. Pipeline Integration with AI Processing

```mermaid
flowchart LR
    Upload[Transcript Upload] --> Process[process-meeting job]
    Process --> Extract[Multi-agent / Monolithic Extract]
    Extract --> Persist[meeting_ai_outputs]
    Persist --> Enqueue[Enqueue embed-meeting]
    Enqueue --> Embed[Embedding Pipeline]
    Embed --> Ready[Meeting AI Ready]
```

**Ordering guarantee:** `embed-meeting` only starts after `process-meeting` completes successfully.

---

## 11. Index Status & UI

| Status | Meaning | UI Indicator |
|--------|---------|--------------|
| `pending` | Job queued | "Indexing..." spinner |
| `running` | Embedding in progress | Progress bar |
| `completed` | All chunks indexed | Green check |
| `failed` | Error after retries | Red warning + retry button |
| `stale` | Transcript newer than chunks | Yellow warning |

---

## 12. Performance & Cost

| Metric | Target |
|--------|--------|
| Embed 75 chunks (single meeting) | < 30s |
| Embed 1000 meetings (batch reindex) | < 4 hours (5 workers) |
| Cost per meeting (75 chunks, ~40k tokens) | ~$0.0008 |
| Cache hit rate (re-embed) | > 80% for unchanged chunks |

---

## 13. Error Handling

| Error | Action |
|-------|--------|
| OpenAI 429 | Backoff; retry batch |
| OpenAI 5xx | Retry 3x; fail job |
| Empty transcript | Skip embedding; status=completed |
| Chunk too large | Force split at sentence boundary |
| DB write failure | Retry transaction; rollback batch |
| Partial batch failure | Retry failed chunks only |

---

## 14. Security

- Embedding jobs inherit workspace auth from triggering user
- No cross-workspace batch operations
- Transcript content not logged in embedding worker
- Reindex admin endpoint requires `workspace:admin` role

---

## Related Documents

- [vector-db-design.md](./vector-db-design.md)
- [rag-architecture.md](./rag-architecture.md)
- [retrieval-flow.md](./retrieval-flow.md)
- [agent-flow.md](./agent-flow.md)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-18 | Initial embedding flow |
