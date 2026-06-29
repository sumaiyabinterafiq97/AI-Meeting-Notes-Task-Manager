# MeetingMind AI — Backend LLM & Agents

Production-grade LLM capabilities for the MeetingMind AI platform.

## Architecture

```
modules/
├── llm/                    # Provider-agnostic LLM service layer
│   ├── providers/          # OpenAI, Claude, Gemini, Local, Mock
│   ├── langchain/          # LangChain Runnable bridge
│   └── services/           # Retry, circuit breaker, Zod validation
├── embeddings/             # Provider registry, batch embed, reindex, observability
├── chunking/               # Strategy registry (fixed, recursive, sliding, semantic)
├── vector/                 # pgvector + FTS, filter validation
├── retrievers/             # Ranking, threshold filtering
├── rag/                    # Hybrid retrieval, context builder, citations, cache
├── agents/                 # Multi-agent extraction & chat
│   ├── summarizer/
│   ├── task-extractor/
│   ├── decision/
│   ├── risk-analyzer/
│   ├── weekly-report/
│   ├── chat/
│   ├── knowledge/
│   ├── tools/              # SearchMeetingsTool, SearchTasksTool, etc.
│   ├── memory/             # Conversation memory & compression
│   ├── security/           # Input sanitization, injection detection
│   ├── schemas/            # Zod + JSON schema resolver (v2.0 / v2.1)
│   └── orchestrator/       # Legacy pipeline facade (delegates to orchestrator/)
├── orchestrator/           # LangGraph multi-agent orchestration layer
│   ├── agents/registry/    # Agent metadata, capabilities, dependencies
│   ├── graphs/             # Compiled workflow graphs
│   ├── workflows/          # Data-driven edge definitions (WORKFLOW_REGISTRY)
│   ├── nodes/              # Independent, testable graph nodes
│   ├── state/              # Graph state, reducers, execution context
│   ├── executors/          # Retry, timeout, circuit breaker, graph executor
│   ├── memory/             # Conversation/session/execution memory adapters
│   ├── events/             # Event bus (MeetingProcessed, ChatCompleted, …)
│   ├── checkpoints/        # Resumable execution snapshots
│   └── middleware/         # Workspace isolation, observability, security
├── observability/          # Metrics, cost, tokens, latency, cache, alerts
│   ├── metrics/            # Counters, histograms, Prometheus export
│   ├── cost-tracking/      # Provider pricing, reports, leaderboards
│   ├── token-monitoring/   # TokenUsageService, budget, reports
│   ├── latency/            # P50/P95/P99, slow-request detection
│   ├── logging/            # Pino structured logs, correlation context
│   ├── cache/              # Unified cache hit/miss observability
│   ├── retry/              # Retry events, provider outage tracking
│   ├── rate-limit/         # Violation tracking, abuse detection
│   ├── dashboards/         # Dashboard aggregator, performance analyzer
│   ├── alerts/             # Threshold alerts, Slack/email channels
│   └── tests/              # Unit, failure, load simulation tests
└── prompts/                # Prompt registry (loads backend/prompts/*.prompt.md)
```

## RAG Pipeline

```
Query → Embedding (provider registry) → Hybrid Search (pgvector + FTS + RRF)
      → Filter validation → Score rerank → Context builder → LLM
```

| Module | Responsibility |
|--------|----------------|
| `embeddings/` | OpenAI/local/voyage providers, batch embed, content-hash, reindex |
| `chunking/` | Recursive, fixed, sliding, semantic strategies per source type |
| `vector/` | pgvector similarity, FTS, workspace-scoped filters |
| `retrievers/` | Top-k, threshold, dedup, ranking |
| `rag/` | Cache, citations, token budget, observability |

## Configuration (RAG)

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | `openai` | Embedding provider (`openai`, `local`, `voyage`) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Model ID (1536 dims) |
| `RAG_CACHE_ENABLED` | `true` | Redis retrieval cache |
| `RERANKER_ENABLED` | `false` | Enable score-boost reranking |
| `RAG_RETRIEVAL_CACHE_TTL_SECONDS` | `900` | Retrieval cache TTL |

Each agent module contains:

- `services/` — agent execution logic
- `types/` — TypeScript interfaces
- `dto/` — input/output DTO aliases
- `schemas/` — Zod schema re-exports

## Agents

| Agent | Input | Output |
|-------|-------|--------|
| Summarizer | Transcript, title, members | Summary, key topics, next steps |
| Task Extractor | Transcript, members | Tasks with owner, priority, deadline |
| Decision | Transcript, summary | Decisions with stakeholders, evidence |
| Risk Analyzer | Transcript, summary, decisions | Risks with severity, likelihood |
| Weekly Report | Meetings, tasks, RAG context | Sections, metrics, citations |
| Chat | User message, history, RAG context | Markdown + citations (SSE) |
| Knowledge | Merged output, transcript | Knowledge entries |

## Structured outputs

All agent outputs are validated with **Zod** before persistence. JSON schemas are sent to providers supporting structured output (OpenAI `json_schema`).

- v2.0 schemas: default (`PROMPT_SCHEMA_V2_1=false`)
- v2.1 schemas: extended fields with confidence scores (`PROMPT_SCHEMA_V2_1=true`)

The output normalizer strips v2.1-only fields before DB merge for backward compatibility.

## Orchestration (LangGraph)

When `AI_PIPELINE_MODE=multi-agent`, the `process-meeting` worker invokes `orchestratorService.runMeetingIntelligence()` which executes the **meeting-intelligence** LangGraph:

```
START → [summarizer ∥ task_extractor ∥ decision] → risk → merge → persist → knowledge → END
```

| Workflow | Entry point |
|----------|-------------|
| Meeting intelligence | `orchestratorService.runMeetingIntelligence()` |
| Weekly report | `orchestratorService.runWeeklyReport()` |
| Chat | `orchestratorService.runChat()` |
| Knowledge update | `orchestratorService.runKnowledgeUpdate()` |

Workflow order is defined in `modules/orchestrator/workflows/workflow.types.ts` — not hardcoded inside agent services.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PIPELINE_MODE` | `monolithic` | `multi-agent` runs LangGraph meeting-intelligence workflow |
| `PROMPT_SCHEMA_V2_1` | `false` | Enable v2.1 extended schemas |
| `LLM_PRIMARY_PROVIDER` | `openai` | Primary model provider |
| `LLM_FALLBACK_CHAIN` | `google,anthropic` | Fallback on failure |
| `AI_USE_MOCK` | `false` | Deterministic mock for CI/dev |
| `WORKSPACE_DAILY_TOKEN_BUDGET` | `500000` | Per-workspace token cap |
| `ALERT_SLACK_WEBHOOK_URL` | — | Slack webhook for critical/high alerts |
| `ALERT_EMAIL_TO` | — | Email recipient for alerts (stub) |

## Observability

Production-grade observability layer in `modules/observability/`:

| Capability | Service | Endpoint / Storage |
|------------|---------|-------------------|
| Metrics | `MetricsService` | `GET /observability/metrics` (Prometheus) |
| Token usage | `TokenUsageService` | `llm_invocations`, `llm_usage_daily` |
| Cost tracking | `CostTrackerService` | Per-invocation USD estimate |
| Latency | `LatencyTrackerService` | P50/P95/P99 histograms |
| Logging | `structuredLogger` (Pino) | JSON logs, correlated by requestId |
| Cache | `CacheObservabilityService` | Hit/miss by namespace |
| Retries | `RetryObservabilityService` | Retry count, provider outages |
| Rate limits | `RateLimitTrackerService` | Violations, abuse patterns |
| Dashboards | `DashboardMetricsService` | `GET /observability/dashboard` |
| Alerts | `AlertService` | `POST /observability/alerts/evaluate` |
| Optimization | `PerformanceAnalyzerService` | `GET /observability/optimization` |

```bash
# Run observability tests
npm test -- --testPathPatterns="observability"
```

See [docs/observability-design.md](../docs/observability-design.md) for full architecture.


Five search tools are registered for dynamic invocation:

```typescript
import { toolExecutorService } from './modules/agents/tools';

const result = await toolExecutorService.execute(
  { name: 'SearchMeetingsTool', arguments: { query: 'Q2 planning' } },
  { workspaceId: '...' },
);
```

## Memory

`ConversationMemoryService` manages chat history:

- Trims to token budget (4k default)
- Compresses long sessions via summarization
- Prepares for Redis-backed session memory (key: `chat:memory:{workspaceId}:{sessionId}`)

## Security

- Input sanitization on all agent inputs
- Prompt injection pattern detection
- Untrusted content wrapped in delimiter blocks
- Transcript/user message length limits
- Workspace-scoped tool execution

## Testing

```bash
npm test -- --testPathPatterns="unit/agents"
npm test -- --testPathPatterns="unit/orchestrator"
npm test -- --testPathPatterns="integration/agents"

# Prompt regression (60 YAML fixtures)
npm run eval:prompts -- --mock --suite all --runs 1

# Concurrent meeting job load test
npm run load:test:meetings -- --concurrency 50
```

Mock provider (`AI_USE_MOCK=true`) returns deterministic structured JSON for all workflows.

## Related docs

- [docs/llm-architecture.md](../docs/llm-architecture.md)
- [docs/agent-architecture.md](../docs/agent-architecture.md)
- [docs/observability-design.md](../docs/observability-design.md)
- [docs/api-design.md](../docs/api-design.md) — Section 12
- [backend/prompts/README.md](./prompts/README.md)
