# Portfolio Screenshot Guide — MeetingMind AI

Use this flow for LinkedIn Featured images, demo GIFs, and resume portfolio.

**Current product UI (v0.7.3):** Meetings + Settings. Meeting detail tabs: **Record & upload · Transcript · Chat · Details**. Soft-hidden routes (Dashboard, Tasks, Insights, Search, Workspace chat, Reports, Knowledge) **redirect to Meetings** — do not plan screenshots of those pages unless you temporarily restore routes.

## Prerequisites

- App running: `npm run dev` from repo root
- `.env` has `AI_USE_MOCK=true` (no OpenAI key required for demo)
- Logged in with a workspace
- Optional: Connect Google Calendar in Settings (or keep `CALENDAR_USE_MOCK=true`)

## Demo transcript

Copy-paste from [`portfolio-demo-transcript.txt`](./portfolio-demo-transcript.txt).

**Also in repo:**

| File                                                   | Use                     |
| ------------------------------------------------------ | ----------------------- |
| `backend/prompts/evaluations/fixtures/summarizer.yaml` | Sprint planning snippet |
| `npm run seed:portfolio-demo`                          | One-command seed        |

## Step-by-step (~5 minutes)

**Seed:**

```bash
npm run seed:portfolio-demo
```

Open the printed meeting URL (log in first if needed).

**Manual flow:**

1. Create meeting (title e.g. `Sprint Planning`) — Meet link appears if Calendar connected
2. **Record & upload** — paste transcript from `portfolio-demo-transcript.txt` **or** upload / screen-record (share tab + allow mic) then **Translate & Transcribe**
3. Wait until status is `READY`
4. Open **Transcript** — confirm English text; download `.txt` / `.md`
5. Open **Chat** — ask: `Summarize this meeting` or `What blockers were raised about production launch?`
6. Open **Settings** — show workspace + Google Calendar connect card

## Routes to screenshot

| Priority | Route                                                     | What to capture                            |
| -------- | --------------------------------------------------------- | ------------------------------------------ |
| **1**    | `/workspaces/{id}/meetings`                               | Meeting list                               |
| **2**    | `/workspaces/{id}/meetings/{meetingId}` → Record & upload | Recorder / upload / Translate & Transcribe |
| **3**    | same → **Transcript**                                     | Document + download                        |
| **4**    | same → **Chat**                                           | Grounded answer / citations                |
| **5**    | `/workspaces/{id}/settings`                               | Calendar connect                           |
| **6**    | `/login` or `/register`                                   | Auth (optional)                            |

**Do not rely on** `/dashboard`, `/tasks`, `/insights`, `/search`, `/chat`, `/reports`, `/knowledge` — they soft-redirect.

## LinkedIn Featured recommendation

Order: Meeting list → Record/Translate → Transcript → Chat → Settings (Calendar).

## Agent pipeline diagram (backend)

For architecture slides, use [`meetingmind-agent-pipeline.png`](./meetingmind-agent-pipeline.png) / [`agent-pipeline.mmd`](./agent-pipeline.mmd) — this documents the **server-side** pipeline, not soft-hidden UI pages.
