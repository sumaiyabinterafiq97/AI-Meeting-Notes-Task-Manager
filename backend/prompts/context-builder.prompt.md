---
id: context-builder
version: "2.1.0"
workflow: rag
variables:
  - retrievedChunks
  - tokenBudget
  - query
  - workspaceName
output_schema: ContextPackage
---

# Context Builder Prompt

## Purpose

Define **deterministic rules** for assembling retrieved chunks into token-budgeted, citation-indexed context blocks for RAG workflows. This is a **formatting specification** — the Context Builder is a pure function (no LLM call).

| Attribute | Value |
|-----------|-------|
| Component | Context Builder Agent / Service |
| Latency target | < 50ms |
| Used by | Chat Agent, Weekly Report Agent, cross-meeting analysis |

## Input Schema

```json
{
  "retrievedChunks": [
    {
      "id": "uuid",
      "content": "string",
      "similarity": "number — 0.0–1.0",
      "meetingId": "uuid | null",
      "sourceType": "transcript | summary | decision | risk | action_item | task | knowledge",
      "metadata": {
        "meetingTitle": "string",
        "meetingDate": "string",
        "speaker": "string | null",
        "timestamp_start": "string | null",
        "severity": "string | null"
      }
    }
  ],
  "tokenBudget": "number — max tokens for context (default 8000)",
  "query": "string — user query for relevance ordering",
  "workspaceName": "string"
}
```

## Output Schema

```json
{
  "blocks": [
    {
      "citationIndex": 1,
      "chunkId": "uuid",
      "content": "string",
      "meetingId": "uuid",
      "meetingTitle": "string",
      "metadata": {}
    }
  ],
  "totalTokens": "number",
  "formattedContext": "string — concatenated blocks"
}
```

## Instructions

### Processing pipeline (ordered)

1. **Deduplicate** — key: `{meetingId}:{sourceType}:{content[0:120]}`. Keep highest similarity.
2. **Sort** — primary: similarity descending; secondary: `meetingDate` descending (recency).
3. **Filter** — drop chunks below similarity threshold (default 0.72) unless < 3 chunks remain.
4. **Trim** — add chunks until `tokenBudget` exceeded; drop lowest similarity first.
5. **Index** — assign `citationIndex` 1..N in final order.
6. **Format** — apply block template below.

### Context block template

```
[CITATION-{N}] Meeting: {meetingTitle} ({meetingDate})
{Speaker: {speaker} | Time: {timestamp} — omit empty fields}
Source: {sourceType}
"{content.trim()}"
```

**Decision/risk chunks** — prefix source line:

```
[CITATION-{N}] Decision from {meetingTitle} ({meetingDate})
"{content}"
```

### Token optimization

| Strategy | Rule |
|----------|------|
| Deduplication | Prevent context pollution from overlapping transcript chunks |
| Similarity trim | Drop lowest scores first when over budget |
| Recency boost | Already in re-ranker; maintain chronological tie-break |
| Metadata minimalism | Title + date only unless speaker/timestamp aid citation |
| Empty retrieval | Emit literal: `No relevant meeting context was retrieved.` |

### Ordering principles

1. Highest relevance to `query`
2. Prefer `decision` and `risk` source types for decision/risk queries (+10% boost at retrieval)
3. Group by meeting only when scores are equal — otherwise strict relevance order
4. Never interleave duplicate meeting content

### Context pollution avoidance

- Do not include more than 3 chunks from the same source document unless budget requires
- Strip boilerplate VTT headers from content before formatting
- Truncate individual chunks to 512 tokens max before assembly

### Budget defaults (from RAG architecture)

| Workflow | `tokenBudget` |
|----------|---------------|
| Workspace chat | 8,000 |
| Per-meeting chat | 3,000 |
| Weekly report | 50,000 |
| Cross-meeting analysis | 24,000 |

## Constraints

- **No LLM generation** — deterministic formatting only
- **Workspace isolation** — chunks pre-filtered by `workspace_id`
- **Citation stability** — indices stable within a single request; may change between requests

## Examples

**Formatted output (two blocks):**

```
[CITATION-1] Meeting: Sprint Planning (2026-06-15)
Speaker: Alex | Time: 00:12:34
Source: transcript
"We agreed to prioritize the auth epic for this sprint."

[CITATION-2] Decision from Sprint Planning (2026-06-15)
Source: decision
"Prioritize authentication epic for current sprint."
```

**Empty retrieval:**

```
No relevant meeting context was retrieved.
```

## Failure Cases

| Scenario | Behavior |
|----------|----------|
| All chunks below threshold | Return empty with standard message |
| Single oversized chunk | Truncate content to fit budget |
| Missing metadata | Use "Unknown" for title; omit optional lines |
| pgvector timeout | Upstream returns FTS-only chunks; format same way |

## Safety Rules

- Do not log full chunk content (PII)
- Never include chunks from other workspaces
- Meeting-scoped chat: filter to `meetingId` before build

## Version

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2026-06-18 | Aligned with v2.1 citation parsing |
| 2.0.0 | 2026-06-18 | Production specification |
| 0.0.0 | 2026-06-18 | Placeholder |

## Metrics

| Metric | Target |
|--------|--------|
| Build latency p95 | < 50ms |
| Avg chunks included | 6–10 |
| Token budget utilization | 70–95% |
| Deduplication rate | Track duplicates removed |

## Optimization Notes

- Cache formatted context: `rag:ctx:{hash(chunks+query)}` TTL 5min
- Pre-compute token counts at chunk ingest time
- Align format with `chat-agent` citation parser expectations
