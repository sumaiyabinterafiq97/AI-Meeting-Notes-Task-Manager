# MeetingMind AI — Backend LLM & Agents

Production-grade LLM capabilities for the MeetingMind AI platform.

## Architecture

```
modules/
├── llm/                    # Provider-agnostic LLM service layer
│   ├── providers/          # OpenAI, Claude, Gemini, Local, Mock
│   ├── langchain/          # LangChain Runnable bridge
│   └── services/           # Retry, circuit breaker, Zod validation
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
│   └── schemas/            # Zod + JSON schema resolver (v2.0 / v2.1)
├── rag/                    # Retrieval, context builder, prompt builder
└── prompts/                # Prompt registry (loads backend/prompts/*.prompt.md)
```

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

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PIPELINE_MODE` | `monolithic` | `multi-agent` for parallel extraction |
| `PROMPT_SCHEMA_V2_1` | `false` | Enable v2.1 extended schemas |
| `LLM_PRIMARY_PROVIDER` | `openai` | Primary model provider |
| `LLM_FALLBACK_CHAIN` | `google,anthropic` | Fallback on failure |
| `AI_USE_MOCK` | `false` | Deterministic mock for CI/dev |
| `WORKSPACE_DAILY_TOKEN_BUDGET` | `500000` | Per-workspace token cap |

## Tool calling

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
npm test -- --testPathPatterns="integration/agents"
```

Mock provider (`AI_USE_MOCK=true`) returns deterministic structured JSON for all workflows.

## Related docs

- [docs/llm-architecture.md](../docs/llm-architecture.md)
- [docs/agent-architecture.md](../docs/agent-architecture.md)
- [docs/api-design.md](../docs/api-design.md) — Section 12
- [backend/prompts/README.md](./prompts/README.md)
