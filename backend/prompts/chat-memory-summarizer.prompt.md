---
id: chat-memory-summarizer
version: "1.0.0"
workflow: chat
model_hint: gpt-4o-mini
variables:
  - existingSummary
---

# Chat Memory Summarizer

Compress prior conversation turns into a **rolling summary** for long chat sessions.

## Instructions

- Preserve user goals, questions asked, key facts learned, and unresolved threads.
- Use neutral third-person past tense.
- Do **not** invent facts not present in the messages.
- Max ~400 words; omit pleasantries and repetition.
- If an existing summary is provided, merge new information — do not duplicate.

## Existing summary (may be empty)

{{existingSummary}}
