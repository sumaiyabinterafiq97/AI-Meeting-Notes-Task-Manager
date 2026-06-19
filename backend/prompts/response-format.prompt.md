---
id: response-format
version: "2.1.0"
workflow: shared
model_hint: none
variables: []
output_schema: ResponseFormatCatalog
---

# Response Format Standards

Provider-agnostic structured output schemas for MeetingMind AI agents.

**Current production prompts:** v2.1.0 — see [schemas/v2.1-schemas.json](./schemas/v2.1-schemas.json)  
**Legacy v2.0 strict schemas:** below (used by `agent-schemas.ts` until `PROMPT_SCHEMA_V2_1` migration)

## Purpose

Central contract for all agent outputs — enables validation (Zod), merge compatibility, and cross-provider portability.

## Instructions

When invoking LLM completion with `responseFormat: json_schema`:

1. Pass the **strict** schema for the agent's `output_schema` reference
2. Set `additionalProperties: false` at root and item objects (OpenAI strict mode)
3. On validation failure → single repair attempt with schema error feedback
4. Log `prompt_version` + schema name in `llm_invocations`

---

## 1. Meeting Summary (`SummarizerOutput` / `MeetingSummaryOutput`)

**Prompt IDs:** `summarizer`, `meeting-summary`  
**Storage:** `meeting_ai_outputs.summary`, `meeting_ai_outputs.topics`

### JSON Schema

```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string", "description": "Executive summary, 1-3 paragraphs" },
    "keyTopics": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 0,
      "maxItems": 8,
      "description": "3-8 topic labels when substance exists"
    }
  },
  "required": ["summary", "keyTopics"],
  "additionalProperties": false
}
```

### Provider mapping

| Provider | Mechanism |
|----------|-----------|
| OpenAI | `response_format: { type: "json_schema", json_schema: { strict: true, ... } }` |
| Claude | Tool `meeting_summary` with `input_schema` |
| Gemini | `generationConfig.responseSchema` + `responseMimeType: application/json` |

---

## 2. Task Extraction (`TaskExtractorOutput`)

**Prompt ID:** `task-extractor`  
**Storage:** `action_item_suggestions`

### JSON Schema (v2.0 strict)

```json
{
  "type": "object",
  "properties": {
    "actionItems": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string", "maxLength": 300 },
          "description": { "type": "string" },
          "suggestedAssignee": { "type": ["string", "null"] },
          "suggestedDueDate": {
            "type": ["string", "null"],
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
            "description": "YYYY-MM-DD or null"
          }
        },
        "required": ["title", "description", "suggestedAssignee", "suggestedDueDate"],
        "additionalProperties": false
      }
    }
  },
  "required": ["actionItems"],
  "additionalProperties": false
}
```

### JSON Schema (v2.1 extended — future)

```json
{
  "properties": {
    "priority": { "enum": ["low", "medium", "high", "critical", null] },
    "dependencies": { "type": "array", "items": { "type": "string" } },
    "confidenceScore": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
```

---

## 3. Decisions (`DecisionOutput`)

**Prompt ID:** `decision-agent`  
**Storage:** `meeting_ai_outputs.decisions`

### JSON Schema (v2.0 strict)

```json
{
  "type": "object",
  "properties": {
    "decisions": {
      "type": "array",
      "maxItems": 15,
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "context": { "type": "string" }
        },
        "required": ["text", "context"],
        "additionalProperties": false
      }
    }
  },
  "required": ["decisions"],
  "additionalProperties": false
}
```

### v2.1 extended fields

`stakeholders[]`, `confidenceScore`, `supportingEvidence`

---

## 4. Risks (`RiskAnalyzerOutput`)

**Prompt ID:** `risk-analyzer`  
**Storage:** `meeting_ai_outputs.risks`

### JSON Schema (v2.0 strict)

```json
{
  "type": "object",
  "properties": {
    "risks": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "severity": { "enum": ["low", "medium", "high"] },
          "context": { "type": "string" }
        },
        "required": ["text", "severity", "context"],
        "additionalProperties": false
      }
    }
  },
  "required": ["risks"],
  "additionalProperties": false
}
```

### v2.1 extended fields

`impact`, `likelihood`, `recommendation`, `evidence`, `confidenceScore`

---

## 5. Weekly Report (`WeeklyReportOutput`)

**Prompt ID:** `weekly-report`  
**Storage:** `workspace_reports`

```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "heading": { "type": "string" },
          "content": { "type": "string" },
          "meetingIds": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["heading", "content"],
        "additionalProperties": false
      }
    },
    "taskStats": {
      "type": "object",
      "additionalProperties": { "type": "number" }
    },
    "meetingCount": { "type": "number" }
  },
  "required": ["title", "sections", "taskStats", "meetingCount"],
  "additionalProperties": false
}
```

---

## 6. Knowledge (`KnowledgeOutput`)

**Prompt ID:** `knowledge-agent`  
**Storage:** `knowledge_entries`

```json
{
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "entityType": {
            "enum": ["definition", "process", "agreement", "technical", "people", "other"]
          },
          "title": { "type": "string", "maxLength": 300 },
          "content": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0.5, "maximum": 1 }
        },
        "required": ["entityType", "title", "content", "confidence"],
        "additionalProperties": false
      }
    }
  },
  "required": ["entries"],
  "additionalProperties": false
}
```

---

## 7. Chat Response (`ChatAgentOutput`)

**Prompt ID:** `chat-agent`  
**Format:** Markdown text (not JSON body) + parsed citations

### Citation object

```json
{
  "index": 1,
  "sourceType": "transcript",
  "chunkId": "uuid",
  "meetingId": "uuid",
  "meetingTitle": "string",
  "meetingDate": "2026-06-15",
  "excerpt": "string — max 200 chars",
  "similarityScore": 0.89
}
```

### Inline citation pattern

Regex: `\[CITATION-(\d+)\]`

### Streaming events (SSE)

```json
{ "type": "token", "content": "..." }
{ "type": "citation", "index": 1, "meetingId": "...", "excerpt": "..." }
{ "type": "done", "messageId": "uuid", "tokenUsage": { "prompt": 0, "completion": 0 } }
{ "type": "error", "code": "...", "message": "..." }
```

---

## 8. Merged Meeting Output (`MeetingExtractionSchema` — v1 compatibility)

Multi-agent merge target for `meeting_ai_outputs`:

```json
{
  "summary": "string",
  "topics": ["string"],
  "decisions": [{ "text": "string", "context": "string" }],
  "risks": [{ "text": "string", "severity": "low|medium|high", "context": "string" }],
  "actionItems": [{
    "title": "string",
    "description": "string",
    "suggestedAssignee": "string|null",
    "suggestedDueDate": "YYYY-MM-DD|null"
  }]
}
```

**Note:** `keyTopics` from Summarizer maps to `topics` at merge.

---

## Provider portability checklist

| Requirement | OpenAI | Claude | Gemini | Local |
|-------------|--------|--------|--------|-------|
| Strict JSON schema | ✅ native | ⚠️ tool use | ✅ responseSchema | ⚠️ prompt-only |
| Streaming chat | ✅ | ✅ | ✅ | ⚠️ varies |
| Schema repair retry | ✅ | ✅ | ✅ | ✅ |
| Null types | `["string","null"]` | same | same | omit nulls |

### Degraded mode (no schema support)

Append to system prompt:

```
Return ONLY valid JSON matching this schema with no markdown fences:
{schema}
```

Validate with Zod; repair once on failure.

---

## Version

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2026-06-18 | v2.1 catalog reference; legacy v2.0 preserved below |
| 2.0.0 | 2026-06-18 | Full schema catalog, provider mapping |
| 0.0.0 | 2026-06-18 | Placeholder |

## Metrics

Track per schema: validation failure rate, repair success rate, provider distribution.

## Optimization Notes

- v2.1 canonical: [schemas/v2.1-schemas.json](./schemas/v2.1-schemas.json) (prompts v2.1.0)
- v2.0 runtime mirror: `agent-schemas.ts` until `PROMPT_SCHEMA_V2_1` migration
