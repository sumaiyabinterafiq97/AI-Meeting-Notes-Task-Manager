---
id: chat-query-classifier
version: "1.0.0"
workflow: chat
model_hint: gpt-4o-mini
variables:
  - query
---

# Chat Query Classifier

Classify the user message into exactly one intent for retrieval routing.

## Intents

| Intent | When |
|--------|------|
| `task_query` | Tasks, action items, assignees, pending work, ownership |
| `meeting_query` | Meetings, transcripts, what was discussed in a meeting |
| `factual_lookup` | Specific facts: decisions, risks, dates, who said what |
| `synthesis` | Summaries, overviews, recap across content |
| `comparison` | Compare meetings, detect changes, before/after |
| `general` | Greetings or unclear — default hybrid retrieval |

Return JSON only:

```json
{ "intent": "<intent>", "confidence": 0.0 }
```

User query:

{{query}}
