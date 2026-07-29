# Feature Inventory — MeetingMind AI v0.7.2

**Product:** MeetingMind AI  
**Version:** v0.7.2  
**Audit date:** 2026-07-29  
**Source of truth:** Implementation (codebase), not prior product docs

---

## Summary

| Status                | Count | Notes                                              |
| --------------------- | ----- | -------------------------------------------------- |
| Implemented           | 25    | Primary UX + soft-hidden APIs/UI that still exist  |
| Partially Implemented | 8     | Conditional, stubbed, or incomplete provider paths |
| Planned               | 4     | Stubs, flags, or missing infra only                |
| Deprecated            | 1     | Soft-hidden primary-nav surfaces (code retained)   |
| Removed               | 0     | Soft-hidden routes redirect; code not deleted      |

| Feature                                    | Category                     |
| ------------------------------------------ | ---------------------------- |
| Email/password authentication              | Implemented                  |
| Google OAuth (+ mock)                      | Implemented                  |
| JWT + refresh cookies                      | Implemented                  |
| Workspaces, invitations, members, settings | Implemented                  |
| Meetings CRUD                              | Implemented                  |
| Paste transcript                           | Implemented                  |
| Audio/video upload                         | Implemented                  |
| Translate & Transcribe (Whisper translate) | Implemented                  |
| Screen recorder (mic + tab mix)            | Implemented                  |
| Transcript view / download                 | Implemented                  |
| Meeting chat (SSE / RAG)                   | Implemented                  |
| Google Calendar + Meet link create         | Implemented                  |
| Notifications bell + preferences           | Implemented                  |
| AI pipeline (monolithic + multi-agent)     | Implemented                  |
| RAG / embeddings / pgvector                | Implemented                  |
| Observability HTTP metrics                 | Implemented                  |
| Docker Compose stack                       | Implemented                  |
| Automated tests (Jest / Vitest)            | Implemented                  |
| Tasks Kanban (API + UI code)               | Implemented (UI soft-hidden) |
| Dashboard / Insights / Search              | Implemented (UI soft-hidden) |
| Workspace chat / Reports / Knowledge       | Implemented (UI soft-hidden) |
| Platform imports (Zoom / Meet / Teams)     | Partially Implemented        |
| Email delivery (Resend)                    | Partially Implemented        |
| Microsoft calendar / Teams Meet create     | Partially Implemented        |
| Chat tools                                 | Partially Implemented        |
| Alert channels (Slack / email)             | Partially Implemented        |
| Deepgram transcription                     | Partially Implemented        |
| Voyage embeddings                          | Partially Implemented        |
| Malware scan                               | Partially Implemented        |
| Live meeting bots                          | Planned                      |
| Speaker diarization                        | Planned                      |
| Playwright E2E                             | Planned                      |
| Production CI/CD (GitHub Actions)          | Planned                      |
| Primary-nav Tasks/Dashboard/etc.           | Deprecated (soft-hidden)     |

---

## Implemented (primary UX)

### Email/password authentication

| Field              | Detail                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Register, login, logout, forgot/reset password with bcrypt-hashed credentials.                                            |
| **Current Status** | Implemented                                                                                                               |
| **Relevant Files** | `backend/src/modules/auth/`, `frontend/src/features/auth/`, `backend/prisma/schema.prisma` (`User`, `PasswordResetToken`) |
| **Dependencies**   | JWT secrets, bcrypt; optional `EMAIL_API_KEY` for reset emails                                                            |
| **Notes**          | Without email key, reset tokens are logged in development.                                                                |

### Google OAuth (+ mock)

| Field              | Detail                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Description**    | Google Sign-In via OAuth; mock path for local/CI.                                                                                                                              |
| **Current Status** | Implemented                                                                                                                                                                    |
| **Relevant Files** | `backend/src/modules/auth/google-auth.service.ts`, `frontend/src/features/auth/pages/GoogleCallbackPage.tsx`, `frontend/src/features/auth/components/GoogleContinueButton.tsx` |
| **Dependencies**   | `GOOGLE_OAUTH_*` or `GOOGLE_AUTH_USE_MOCK=true`                                                                                                                                |
| **Notes**          | Also `POST /auth/google/mock` for automated flows.                                                                                                                             |

### JWT + refresh cookies

| Field              | Detail                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Description**    | Bearer access JWT; httpOnly refresh cookie with rotation.                                                      |
| **Current Status** | Implemented                                                                                                    |
| **Relevant Files** | `backend/src/lib/jwt.ts`, `backend/src/lib/cookies.ts`, `frontend/src/lib/api-client.ts`, `RefreshToken` model |
| **Dependencies**   | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 chars)                                                         |
| **Notes**          | Access token held in memory on the client; not in localStorage.                                                |

### Workspaces, invitations, members, settings

| Field              | Detail                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Description**    | Multi-tenant workspaces with OWNER/MEMBER roles, invites, settings.                                         |
| **Current Status** | Implemented                                                                                                 |
| **Relevant Files** | `backend/src/modules/workspaces/`, `frontend/src/features/workspaces/`, `frontend/src/layouts/nav-items.ts` |
| **Dependencies**   | Auth                                                                                                        |
| **Notes**          | Settings also hosts Calendar connect UI.                                                                    |

### Meetings CRUD + capture loop

| Field              | Detail                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Meeting list/detail; create with optional Meet link; paste transcript; upload audio/video; screen record; Translate & Transcribe; transcript download; meeting chat.                                  |
| **Current Status** | Implemented                                                                                                                                                                                           |
| **Relevant Files** | `backend/src/modules/meetings/`, `backend/src/modules/transcription/`, `frontend/src/features/meetings/` (`ScreenRecorder.tsx`, `AudioUpload.tsx`, `TranscriptDocument.tsx`, `MeetingDetailPage.tsx`) |
| **Dependencies**   | Whisper/OpenAI or mock; ffmpeg for video extract when configured                                                                                                                                      |
| **Notes**          | Upload stores only (`DRAFT`); user must start Translate & Transcribe. Default mode: `translate_to_english`. Meeting detail tabs: Record & upload \| Transcript \| Chat \| Details.                    |

### Google Calendar + Meet

| Field              | Detail                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Description**    | Connect Google Calendar; create events with Meet URLs; sync; start reminders.                          |
| **Current Status** | Implemented                                                                                            |
| **Relevant Files** | `backend/src/modules/calendar/`, `frontend/src/features/workspaces/components/CalendarConnectCard.tsx` |
| **Dependencies**   | Calendar OAuth vars or `CALENDAR_USE_MOCK`                                                             |
| **Notes**          | Join Meet button on meeting detail when `meetUrl` present.                                             |

### Meeting chat (SSE / RAG)

| Field              | Detail                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Meeting-scoped RAG chat with SSE streaming and corpus fallback for summarize/overview.                                |
| **Current Status** | Implemented                                                                                                           |
| **Relevant Files** | `backend/src/modules/chat/`, `backend/src/modules/rag/`, `frontend/src/features/chat/components/MeetingChatPanel.tsx` |
| **Dependencies**   | Transcript + embeddings; LLM or mock                                                                                  |
| **Notes**          | Live on meeting detail Chat tab.                                                                                      |

### AI pipeline + agents + RAG

| Field              | Detail                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Post-transcript analysis (summary, decisions, risks, action items); LangGraph multi-agent optional; chunk → embed → hybrid retrieve.                     |
| **Current Status** | Implemented                                                                                                                                              |
| **Relevant Files** | `backend/src/modules/agents/`, `backend/src/modules/orchestrator/`, `backend/src/modules/embeddings/`, `backend/src/modules/vector/`, `backend/prompts/` |
| **Dependencies**   | `AI_PIPELINE_MODE`, LLM keys or `AI_USE_MOCK`                                                                                                            |
| **Notes**          | Structured AI outputs are produced server-side; meeting detail does **not** currently render Insights/ActionItem UI (components exist but are unwired).  |

### Notifications

| Field              | Detail                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| **Description**    | In-app bell, mark read, account preferences.                                 |
| **Current Status** | Implemented                                                                  |
| **Relevant Files** | `backend/src/modules/notifications/`, `frontend/src/features/notifications/` |
| **Dependencies**   | Auth                                                                         |
| **Notes**          | Email notification prefs stored; outbound email depends on Resend key.       |

### Observability

| Field              | Detail                                                                             |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Description**    | `/health`, `/observability/metrics` (+ JSON, dashboard, alerts evaluate).          |
| **Current Status** | Implemented                                                                        |
| **Relevant Files** | `backend/src/modules/observability/`, `backend/src/routes/observability.routes.ts` |
| **Dependencies**   | Optional `OBSERVABILITY_API_KEY` for admin routes                                  |
| **Notes**          | Prometheus text at `/observability/metrics` is open; other routes may require key. |

### Docker Compose + tests

| Field              | Detail                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **Description**    | Compose: postgres (pgvector), redis, backend, frontend. Jest (backend) + Vitest (frontend). |
| **Current Status** | Implemented                                                                                 |
| **Relevant Files** | `docker-compose.yml`, `backend/tests/`, `frontend/src/**/*.test.*`                          |
| **Dependencies**   | Docker optional for local host + compose DB                                                 |
| **Notes**          | No GitHub Actions workflows on disk. Husky + lint-staged on pre-commit.                     |

---

## Implemented (soft-hidden UI)

Backend APIs and frontend feature modules exist. Routes use `RedirectToMeetings`. Nav shows only Meetings + Settings.

| Feature        | Backend                                 | Frontend code                      | Route behavior |
| -------------- | --------------------------------------- | ---------------------------------- | -------------- |
| Tasks Kanban   | `modules/tasks/`                        | `features/tasks/`                  | Soft-hidden    |
| Dashboard      | `modules/dashboard/`                    | `features/dashboard/`              | Soft-hidden    |
| Insights       | `modules/insights/`                     | `features/insights/`               | Soft-hidden    |
| Search         | `modules/search/`                       | `features/search/`                 | Soft-hidden    |
| Workspace chat | `modules/chat/workspace-chat.routes.ts` | `features/chat/pages/ChatPage.tsx` | Soft-hidden    |
| Reports        | `modules/reports/`                      | `features/reports/`                | Soft-hidden    |
| Knowledge      | `modules/knowledge/`                    | `features/knowledge/`              | Soft-hidden    |

**Relevant Files:** `frontend/src/routes/index.tsx`, `frontend/src/routes/RedirectToMeetings.tsx`, `frontend/src/layouts/nav-items.ts`

**Notes:** Accept/reject action items → tasks APIs work; `ActionItemReview` / `MeetingInsightsPanel` are not mounted on `MeetingDetailPage`.

---

## Partially Implemented

| Feature            | Status detail                                     | Relevant Files                         | Notes              |
| ------------------ | ------------------------------------------------- | -------------------------------------- | ------------------ |
| Platform imports   | Need client `transcriptText`/`vttContent` or mock | `backend/src/modules/capture/imports/` | Remote fetch → 501 |
| Email delivery     | Resend when `EMAIL_API_KEY` set                   | `backend/src/lib/email.ts`             | Else console log   |
| Microsoft calendar | Sync yes; Meet create 501                         | `microsoft-calendar.provider.ts`       |                    |
| Chat tools         | Code present, default off                         | `CHAT_TOOLS_ENABLED`                   |                    |
| Alert Slack/email  | Log stubs without webhooks                        | `observability/alerts/`                |                    |
| Deepgram           | Always 501                                        | `deepgram-transcription.provider.ts`   |                    |
| Voyage embeddings  | Throws not configured                             | `voyage-embedding.provider.ts`         |                    |
| Malware scan       | Always clean noop                                 | `malware-scan.service.ts`              |                    |

---

## Planned

| Feature             | Evidence                          | Notes                       |
| ------------------- | --------------------------------- | --------------------------- |
| Live meeting bots   | `capture/bots/stubs/` → 501       | Phase D stub                |
| Speaker diarization | `DIARIZATION_ENABLED` in env only | No implementation           |
| Playwright E2E      | No Playwright config/specs        | Listed in README next steps |
| Production CI/CD    | No `.github/workflows`            | Husky only                  |

---

## Deprecated / soft-hidden (not removed)

Primary navigation entries for Tasks, Dashboard, Insights, Search, Workspace chat, Reports, and Knowledge are deprecated as product surfaces. Code and APIs remain; UI redirects to Meetings.

---

## Soft-hide route map

| Path                                      | Behavior   |
| ----------------------------------------- | ---------- |
| `/workspaces/:id/dashboard`               | → Meetings |
| `/workspaces/:id/insights`                | → Meetings |
| `/workspaces/:id/tasks`                   | → Meetings |
| `/workspaces/:id/search`                  | → Meetings |
| `/workspaces/:id/chat` (+ `:sessionId`)   | → Meetings |
| `/workspaces/:id/reports` (+ `:reportId`) | → Meetings |
| `/workspaces/:id/knowledge`               | → Meetings |

Primary nav: **Meetings**, **Settings** only.
