# Eval Runner Specification (Future Implementation)

**Status:** Specification only — no application code in this document  
**Consumers:** Engineering team implementing `npm run eval:prompts`

---

## 1. Overview

The eval runner loads YAML fixtures from `evaluations/fixtures/`, invokes agents via `LLMService`, scores outputs, and emits a pass/fail report with metrics.

```
fixtures/*.yaml → EvalRunner → LLMService → Scorer → report.json
```

---

## 2. CLI interface

```bash
npm run eval:prompts -- [options]

Options:
  --suite <name>           summarizer | task-extractor | decision-agent | risk-analyzer | chat-agent | all
  --agent <id>             Alias for single suite
  --fixtures <path>        Override fixture file
  --prompt-version <ver>   e.g. 2.0.0 (default from manifest)
  --schema-version <ver>   2.0 | 2.1 (default 2.0)
  --model <id>             Override model_hint
  --mock                   Use mock LLM provider (CI default)
  --runs <n>               Consistency runs per case (default 3)
  --case <id>              Run single case e.g. TC-SUM-001
  --include-v21            Include v21_cases from fixture files
  --output <path>          Write report JSON (default stdout)
  --fail-fast              Stop on first failure
```

---

## 3. Execution flow per case

1. Load case from YAML
2. Resolve `promptId` from `agent` field
3. `promptRegistry.render(promptId, { variables })`
4. Build `userContent` per agent conventions (mirror `agent-runner.service.ts`)
5. Call `llmService.complete()` or `completeStream()` for chat
6. Parse output (JSON.parse or raw markdown)
7. Run scorers from `scoring.modes`
8. Record pass/fail + latency + tokens

---

## 4. Scorer implementations

### `schema_validity`

- Load JSON Schema from `agent-schemas.ts` (v2.0) or `schemas/v2.1-schemas.json` (v2.1)
- Validate with Ajv or Zod
- Pass if valid

### `rule_based`

Evaluate `expect.fields`, `expect.array_paths`, `expect.items`:

| Rule | Evaluator |
|------|-----------|
| `min_length` / `max_length` | string length |
| `min_words` / `max_words` | word count |
| `min_items` / `max_items` | array length |
| `must_contain` / `must_not_contain` | case-insensitive substring |
| `must_contain_any` | any substring matches |
| `must_include_any` | array items fuzzy-match |
| `exact` | strict equality |
| `min` / `max` | numeric comparison |
| `enum` | value in set |
| `must_match_regex` | RegExp test on output |

### `exact_match`

- Deep compare output to `expect.exact`
- Used for empty arrays and golden outputs

### `llm_judge` (optional)

- Separate model call with rubric
- Rubrics: `hallucination_free`, `language_matches_input`, `citation_accurate`
- Pass if judge score ≥ 0.8

---

## 5. Consistency scoring

When `--runs 3`:

- Parse JSON outputs
- Compare structural hash (sorted keys, array lengths)
- Consistency = matching runs / total runs
- Fail if below `manifest.defaults.consistency_threshold`

---

## 6. Report format

```json
{
  "runId": "uuid",
  "timestamp": "2026-06-18T12:00:00Z",
  "prompt_version": "2.0.0",
  "schema_version": "2.0",
  "model": "mock",
  "summary": {
    "total": 44,
    "passed": 42,
    "failed": 2,
    "pass_rate": 0.955,
    "avg_latency_ms": 120,
    "total_tokens": 45000
  },
  "quality_gates": {
    "schema_validity": { "value": 0.99, "pass": true },
    "hallucination_rate": { "value": 0.02, "pass": true }
  },
  "cases": [
    {
      "id": "TC-SUM-001",
      "passed": true,
      "latency_ms": 95,
      "scorers": { "schema_validity": true, "rule_based": true }
    }
  ]
}
```

---

## 7. CI integration

```yaml
# .github/workflows/prompt-eval.yml (future)
- name: Prompt eval (mock)
  run: npm run eval:prompts -- --suite all --mock --runs 1
```

Quality gates from `manifest.yaml`:

- `schema_validity_min: 0.98`
- `hallucination_rate_max: 0.05`

---

## 8. File references

| File | Purpose |
|------|---------|
| `fixtures/manifest.yaml` | Suite index + gates |
| `fixtures/fixture-case.schema.json` | Case JSON Schema |
| `fixtures/*.yaml` | Golden cases |
| `../../schemas/v2.1-schemas.json` | v2.1 validation |
| `../prompt-evaluation.md` | Metrics definitions |

---

## 9. v2.1 eval workflow

1. Implement v2.1 schemas in `agent-schemas.ts`
2. Bump prompts to 2.1.0
3. Run: `npm run eval:prompts -- --include-v21 --schema-version 2.1`
4. Compare pass rate vs v2.0 baseline
5. Sign off in `schemas/v2.1-extended-schemas.md` §11
