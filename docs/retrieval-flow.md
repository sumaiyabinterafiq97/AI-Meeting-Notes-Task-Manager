# Retrieval Flow — MeetingMind AI

**Product:** MeetingMind AI  
**Version:** 1.0  
**Status:** Architecture — Documentation Only  
**Scope:** User question through grounded answer — retrieval-focused detail

---

## 1. End-to-End Retrieval Pipeline

```mermaid
flowchart TB
    Q[User Question] --> Norm[Query Normalization]
    Norm --> EmbedQ[Embedding Query]
    EmbedQ --> Cache{Retrieval Cache?}
    Cache -->|Hit| Cached[Return Cached Chunks]
    Cache -->|Miss| Hybrid[Hybrid Search]
    Hybrid --> ANN[Vector ANN Search]
    Hybrid --> FTS[Keyword FTS Search]
    ANN --> RRF[RRF Fusion]
    FTS --> RRF
    RRF --> Filter[Metadata Filtering]
    Filter --> Rank[Similarity Ranking]
    Rank --> Rerank{Re-ranker enabled?}
    Rerank -->|Yes| CrossEnc[Cross-encoder Re-rank]
    Rerank -->|No| TopK[Top-K Selection]
    CrossEnc --> TopK
    TopK --> Context[Context Construction]
    Context --> Prompt[Prompt Construction]
    Prompt --> LLM[LLM Service]
    LLM --> Answer[Final Answer + Citations]
```

---

## 2. Detailed Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant API
    participant Ret as Retriever Agent
    participant Cache as Redis
    participant LLM as LLM Service
    participant VDB as pgvector + FTS
    participant CB as Context Builder
    participant PB as Prompt Builder
    participant Provider as OpenAI

    User->>API: Question
    API->>Ret: retrieve(query, workspaceId, filters)

    Ret->>Ret: normalize(query)
    Ret->>Cache: GET rag:emb:{hash(query)}
    alt Embedding cached
        Cache-->>Ret: queryVector
    else
        Ret->>LLM: embed(query)
        LLM-->>Ret: queryVector
        Ret->>Cache: SET rag:emb:{hash} TTL 1h
    end

    Ret->>Cache: GET rag:ret:{ws}:{hash(query+filters)}
    alt Retrieval cached
        Cache-->>Ret: chunks[]
    else
        par Parallel search
            Ret->>VDB: ANN(queryVector, workspaceId, topK=50)
            Ret->>VDB: FTS(query, workspaceId, topK=50)
        end
        VDB-->>Ret: vectorResults[], ftsResults[]
        Ret->>Ret: RRF fusion → ranked[]
        Ret->>Ret: metadata filter + threshold
        Ret->>Cache: SET rag:ret TTL 15min
    end

    Ret-->>API: RetrievedChunk[]

    API->>CB: buildContext(chunks, budget)
    CB-->>API: ContextBlock[]

    API->>PB: buildPrompt(system, context, history, query)
    PB-->>API: Message[]

    API->>LLM: completeStream(messages)
    loop Stream
        LLM->>Provider: stream
        Provider-->>LLM: tokens
        LLM-->>API: SSE tokens
        API-->>User: streamed answer
    end

    API-->>User: citations + done
```

---

## 3. Query Embedding

```mermaid
flowchart LR
    Raw[Raw Query] --> Trim[Trim whitespace]
    Trim --> Hash[SHA256 hash]
    Hash --> Cache{Cached?}
    Cache -->|Yes| Vector[Return vector]
    Cache -->|No| API[OpenAI embed API]
    API --> Normalize[L2 normalize]
    Normalize --> Store[Cache 1h]
    Store --> Vector
```

| Parameter | Value |
|-----------|-------|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Cache TTL | 1 hour |
| Cache key | `rag:emb:{sha256(normalized_query)}` |

---

## 4. Vector Search

```sql
-- Conceptual ANN query
SELECT id, content, meeting_id, source_type, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM document_chunks
WHERE workspace_id = $2
  AND embedding IS NOT NULL
  AND ($3::uuid IS NULL OR meeting_id = $3)
ORDER BY embedding <=> $1::vector
LIMIT 50;
```

| Parameter | Default | Chat | Search |
|-----------|---------|------|--------|
| Top-K (ANN) | 50 | 50 | 20 |
| Min similarity | 0.65 | 0.70 | 0.65 |
| `ef_search` | 40 | 40 | 40 |

---

## 5. Similarity Ranking

```mermaid
flowchart TB
    Results[Raw ANN + FTS Results] --> RRF[RRF Score Calculation]
    RRF --> Sort[Sort by RRF desc]
    Sort --> Threshold{similarity >= min?}
    Threshold -->|Yes| Keep[Keep chunk]
    Threshold -->|No| Drop[Drop chunk]
    Keep --> Dedup[Deduplicate by source_id]
    Dedup --> Final[Ranked List]
```

### RRF Scoring

```
For each document d:
  rrf_score(d) = Σ 1/(60 + rank_in_list_i(d))
```

| List | Weight |
|------|--------|
| Vector ANN | 1.0 |
| FTS | 1.0 |
| Future: BM25 sparse | 0.5 |

---

## 6. Metadata Filtering

```mermaid
flowchart LR
    Ranked[Ranked Chunks] --> WS[workspace_id — always]
    WS --> Meeting{meeting_id filter?}
    Meeting --> Source{source_type filter?}
    Source --> Date{date_range filter?}
    Date --> Speaker{speaker filter?}
    Speaker --> Final[Filtered Chunks]
```

| Filter | Required | Applied At |
|--------|----------|------------|
| `workspace_id` | ✅ Always | SQL WHERE |
| `meeting_id` | Meeting chat only | SQL WHERE |
| `source_type` | Optional | SQL WHERE |
| `date_range` | Weekly report | JOIN meetings |
| `speaker` | Optional | JSONB filter |

---

## 7. Re-ranking (Phase 6+)

```mermaid
sequenceDiagram
    participant Ret as Retriever
    participant Rerank as Cohere Rerank
    participant CB as Context Builder

    Ret->>Rerank: rerank(query, top50Documents)
    Rerank-->>Ret: top10 reranked
    Ret->>CB: buildContext(top10)
```

| Phase | Re-ranker | Latency Added |
|-------|-----------|---------------|
| MVP | None (RRF only) | 0ms |
| v2 | Cohere Rerank v3 | +100–300ms |

---

## 8. Context Construction

```mermaid
flowchart TB
    Chunks[Top-K Chunks] --> Dedup[Remove duplicate sources]
    Dedup --> Sort[Sort: relevance desc, date asc]
    Sort --> Budget[Token budget accumulator]
    Budget --> Add{Add chunk?}
    Add -->|Fits| Include[Include in context]
    Add -->|Overflow| Skip[Skip lower relevance]
    Include --> Format[Format CITATION-N blocks]
    Skip --> Format
```

**Token budget allocation:**
- Retrieved context: 24,000 tokens max
- Reserve per chunk header: 50 tokens
- Minimum chunks included: 1 (if any pass threshold)

---

## 9. Prompt Construction

```mermaid
flowchart TB
    System[System Prompt Template] --> Assemble
    Context[CITATION-N Blocks] --> Assemble
    History[Chat History — truncated] --> Assemble
    Query[User Question] --> Assemble
    Assemble[Message Array] --> Validate{Token count OK?}
    Validate -->|Yes| Send[Send to LLM]
    Validate -->|No| Truncate[Drop oldest history]
    Truncate --> Validate
```

---

## 10. Caching Architecture

```mermaid
flowchart TB
    subgraph L1["L1 — Query Embedding Cache"]
        E1["rag:emb:{hash} — TTL 1h"]
    end

    subgraph L2["L2 — Retrieval Result Cache"]
        E2["rag:ret:{ws}:{hash} — TTL 15min"]
    end

    subgraph Invalidation["Invalidation Events"]
        I1[Meeting updated]
        I2[Meeting deleted]
        I3[Re-embed complete]
    end

    I1 & I2 & I3 --> E2
```

| Cache Layer | Hit Rate Target | Savings |
|-------------|-----------------|---------|
| Query embedding | 30% | Embedding API cost |
| Retrieval results | 20% | DB query load |
| Combined | — | ~25% latency reduction on repeats |

---

## 11. Fallback Strategy

```mermaid
stateDiagram-v2
    [*] --> HybridSearch
    HybridSearch --> Success: vector + FTS OK
    HybridSearch --> VectorOnly: FTS error
    HybridSearch --> FTSOnly: vector index down
    HybridSearch --> Empty: both fail
    VectorOnly --> Success
    FTSOnly --> Success
    Success --> ContextBuild
    Empty --> NoContextResponse
    ContextBuild --> LLMGenerate
    LLMGenerate --> [*]
    NoContextResponse --> [*]
```

| Failure | Fallback | User Impact |
|---------|----------|-------------|
| pgvector extension error | FTS-only | Reduced semantic quality |
| Embedding API down | FTS-only | Keyword matching only |
| Zero results | Skip LLM; canned response | "Not found" message |
| LLM down | Return raw search results | Search-only mode |

---

## 12. Error Handling

| Stage | Error | Handling |
|-------|-------|----------|
| Embed query | 429/5xx | Retry 3x; FTS fallback |
| ANN search | Timeout | Retry once; reduce ef_search |
| FTS search | Error | Vector-only results |
| Re-ranker | Error | Skip; use RRF order |
| Context build | Zero chunks | Return "not found" |
| LLM | Error | SSE error event; partial save |

All errors logged with `correlationId`, `workspaceId`, `queryHash` (not raw query in prod logs).

---

## 13. Performance Targets

| Stage | p50 | p95 |
|-------|-----|-----|
| Query embed (uncached) | 100ms | 300ms |
| ANN search | 30ms | 100ms |
| FTS search | 10ms | 50ms |
| RRF + filter | 5ms | 20ms |
| Re-rank (v2) | 150ms | 400ms |
| Context build | 5ms | 15ms |
| **Total retrieval** | **150ms** | **500ms** |

---

## 14. Security

- Mandatory `workspace_id` in all SQL queries
- Meeting scope enforced before search execution
- Retrieval cache keys include workspace ID — no cross-tenant cache pollution
- Query content not stored in logs (hash only)
- Rate limit: 60 retrievals/min per user

---

## Related Documents

- [query-flow.md](./query-flow.md)
- [rag-architecture.md](./rag-architecture.md)
- [vector-db-design.md](./vector-db-design.md)
- [agent-architecture.md](./agent-architecture.md)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-18 | Initial retrieval flow |
