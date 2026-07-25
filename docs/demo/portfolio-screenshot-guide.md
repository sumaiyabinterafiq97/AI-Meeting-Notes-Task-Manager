# Portfolio Screenshot Guide — MeetingMind AI

Use this flow to populate the app for LinkedIn Featured images, demo GIFs, and resume portfolio.

## Prerequisites

- App running: `npm run dev` from repo root
- `.env` has `AI_USE_MOCK=true` (no OpenAI key required for demo)
- Logged in with a workspace (rename "QA Test Workspace" → "Acme Engineering" in Settings if desired)

## Demo transcript

Copy-paste from [`portfolio-demo-transcript.txt`](./portfolio-demo-transcript.txt) (~1,200 chars).

**Also in repo (shorter sources):**

| File                                                   | Use                                                   |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `backend/scripts/load-test-meeting-jobs.ts`            | `SAMPLE_TRANSCRIPT` (3 lines, minimal)                |
| `backend/prompts/evaluations/fixtures/summarizer.yaml` | TC-SUM-001 sprint planning snippet                    |
| `backend/tests/helpers/meeting-helper.ts`              | Test payload only (`'A'.repeat(120)` — not realistic) |

## Step-by-step (5 minutes)

**One-command demo seed** (uploads transcript + runs AI with mock provider):

```bash
npm run seed:portfolio-demo
```

Then open the printed URLs in your browser (log in first if needed).

Manual flow: (optional): Title `Sprint Planning`, attendees `Alex Chen, Jordan Park, Maria Santos, Sarah Kim` 2. Open meeting → **Recording & transcript** → paste transcript from `portfolio-demo-transcript.txt` **or** upload a recording then click **Translate & Transcribe** 3. Wait until status is **Processed** / `READY` (not Draft) 4. Open **Insights** / AI panel → confirm summary, decisions, risks, action items 5. Open **Chat** tab → ask: `What blockers were raised about production launch?` 6. Accept 1–2 action items → creates tasks for kanban screenshot 7. Revisit **Dashboard** if enabled — metrics should show Meetings: 1, AI Summaries: 1, etc.

## Routes to screenshot (replace `{workspaceId}` and `{meetingId}`)

| Priority | Route                                                               | What to capture                                                 |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| **1**    | `/workspaces/{workspaceId}/meetings/{meetingId}` → **Insights** tab | Summary, decisions, risks, action items                         |
| **2**    | `/workspaces/{workspaceId}/meetings/{meetingId}` → **Chat** tab     | Grounded answer with citations                                  |
| **3**    | `/workspaces/{workspaceId}/dashboard`                               | AI metrics, recommendations, recent meetings (after processing) |
| **4**    | `/workspaces/{workspaceId}/search?q=API+latency`                    | Semantic search snippets                                        |
| **5**    | `/workspaces/{workspaceId}/tasks`                                   | Kanban with accepted action items                               |
| **6**    | `/workspaces/{workspaceId}/chat`                                    | Workspace-level chat (optional)                                 |
| **7**    | `/workspaces/{workspaceId}/insights`                                | Workspace insights hub (optional)                               |

**Get IDs from the browser URL** after opening any workspace/meeting page.

## LinkedIn Featured recommendation

| Slot | Asset                                                 |
| ---- | ----------------------------------------------------- |
| 1    | GitHub repo link                                      |
| 2    | Carousel: Dashboard → Meeting Insights → Chat         |
| 3    | Architecture PNG from `docs/agent-flow.md` (optional) |

**Avoid:** Empty transcript upload page, Draft status, "QA Test Workspace" name.

## Dashboard-only screenshot

Your dashboard layout is fine for a **carousel slide** only **after** step 7 above (non-zero AI Summaries, recommendations filled). Before processing, it looks empty — do not use as the only Featured image.
