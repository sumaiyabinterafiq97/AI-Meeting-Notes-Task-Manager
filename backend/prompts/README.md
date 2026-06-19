# MeetingMind AI Prompt Templates

Versioned prompt templates for multi-agent LLM workflows.

**Style guide:** [prompt-style-guide.md](./prompt-style-guide.md)  
**Evaluation index:** [prompt-evaluation.md](./prompt-evaluation.md)  
**Schema catalog:** [response-format.prompt.md](./response-format.prompt.md)

## Structure

Each `.prompt.md` file contains:

- **YAML frontmatter** — `id`, `version`, `workflow`, `model_hint`, `variables`, `output_schema`
- **Documentation sections** — Purpose, schemas, failure cases, metrics
- **`## System Instructions`** — Runtime prompt loaded by `PromptRegistryService`
- **Eval fixtures** — `evaluations/{agent}-eval.md`

## Templates

| File | Registry ID | Agent | Workflow |
|------|-------------|-------|----------|
| `meeting-summary.prompt.md` | `meeting-summary` | Meeting Summary (canonical doc) | process-meeting |
| `summarizer.prompt.md` | `summarizer` | Summarizer (**runtime**) | summarizer |
| `task-extractor.prompt.md` | `task-extractor` | Task Extractor | task-extractor |
| `decision-agent.prompt.md` | `decision-agent` | Decision | decision |
| `risk-analyzer.prompt.md` | `risk-analyzer` | Risk Analyzer | risk-analyzer |
| `knowledge-agent.prompt.md` | `knowledge-agent` | Knowledge | knowledge-extract |
| `weekly-report.prompt.md` | `weekly-report` | Weekly Report | weekly-report |
| `chat-agent.prompt.md` | `chat-agent` | Chat | chat |
| `context-builder.prompt.md` | `context-builder` | Context Builder (spec) | rag |
| `response-format.prompt.md` | `response-format` | Shared schemas | shared |

## Schemas

| File | Version | Status |
|------|---------|--------|
| [response-format.prompt.md](./response-format.prompt.md) | 2.0 | Production strict schemas |
| [schemas/v2.1-extended-schemas.md](./schemas/v2.1-extended-schemas.md) | 2.1 | **Approved** — extended fields |
| [schemas/v2.1-schemas.json](./schemas/v2.1-schemas.json) | 2.1-draft | Machine-readable JSON Schema |

## Evaluations

| Resource | Description |
|----------|-------------|
| [prompt-evaluation.md](./prompt-evaluation.md) | Metrics, gates, procedure |
| [evaluations/fixtures/](./evaluations/fixtures/) | **60 YAML golden cases** (7 suites) |
| [evaluations/eval-runner-spec.md](./evaluations/eval-runner-spec.md) | Future `npm run eval:prompts` spec |

## Versioning

Current production prompt version: **2.1.0**

| Version | Scope |
|---------|-------|
| v1.x | Initial minimal prompts |
| v2.0 | Production-grade: few-shots, injection defense, eval fixtures |
| v2.1 | Extended schemas shipped; 60 YAML golden cases; backend schema migration pending |

## Loading

Loaded at runtime by `PromptRegistryService` in `src/modules/prompts/`.

Only `## System Instructions` (or `## Instructions`) is extracted as the system prompt; transcript and context are supplied by agent services as user messages.

See [docs/llm-architecture.md](../../docs/llm-architecture.md) for prompt management design.
