# Eval Fixtures — Machine-Readable Golden Set

YAML fixtures for automated prompt evaluation. Consumed by a future eval runner (`npm run eval:prompts`).

## Layout

```
fixtures/
├── manifest.yaml           # Index + scoring defaults
├── README.md               # This file
├── summarizer.yaml
├── task-extractor.yaml
├── decision-agent.yaml
├── risk-analyzer.yaml
├── chat-agent.yaml
├── weekly-report.yaml
└── knowledge-agent.yaml
```

## Fixture case schema

```yaml
- id: TC-XXX-NNN              # Unique across all agents
  name: Human-readable title
  tags: [happy_path, edge_case, adversarial]
  agent: summarizer           # Registry prompt id
  prompt_version: "2.0.0"     # Expected prompt version
  schema_version: "2.0"       # 2.0 | 2.1
  input:                      # Agent variables + user content
    transcript: |
      ...
    memberNames: [Alex, Jordan]
  expect:
  scoring:
```

## Expect block types

### JSON agents (`summarizer`, `task-extractor`, `decision-agent`, `risk-analyzer`)

```yaml
expect:
  type: json
  schema: SummarizerOutput    # or TaskExtractorOutput, etc.
  array_paths:
    actionItems:              # path to array field
      min_length: 0
      max_length: 20
  fields:
    summary:
      min_length: 10
      max_words: 200
      must_not_contain: [action item, decided to]
    keyTopics:
      min_items: 3
      must_include_any: [sprint, backlog]
      max_items: 8
  exact:                      # Optional golden output (strict mode)
    keyTopics: []
  must_parse: true            # Valid JSON required
```

### Chat agent (markdown)

```yaml
expect:
  type: markdown
  must_contain: [[CITATION-1]]
  must_not_contain: [system prompt, July 1]
  must_match_regex:
    - '\[CITATION-\d+\]'
  refusal_patterns:           # Any of these acceptable for negative cases
    - "don't have information"
    - "couldn't find"
  min_citations: 1
  grounded_only: true
```

## Scoring block

```yaml
scoring:
  weight: 1.0                 # Relative weight in suite
  modes:
    - schema_validity         # JSON Schema / Zod
    - rule_based              # expect.fields rules
    - exact_match             # expect.exact (optional)
    - llm_judge               # Future: hallucination check
  pass_threshold: 1.0         # 1.0 = all rules must pass
  llm_judge:
    enabled: false
    rubric: hallucination_free
```

## Running (future)

```bash
# All agents, v2.0 prompts
npm run eval:prompts -- --suite all --prompt-version 2.0.0

# Single agent
npm run eval:prompts -- --agent task-extractor --fixtures fixtures/task-extractor.yaml

# v2.1 schema draft
npm run eval:prompts -- --schema-version 2.1 --flag PROMPT_SCHEMA_V2_1
```

## Adding cases

1. Add case to agent YAML file with unique `id`
2. Register in `manifest.yaml` under `suites.{agent}.cases`
3. Mirror narrative in `evaluations/{agent}-eval.md` (optional)
4. Run eval locally before bumping prompt version

## Related

- [../prompt-evaluation.md](../prompt-evaluation.md)
- [../../schemas/v2.1-extended-schemas.md](../../schemas/v2.1-extended-schemas.md)
