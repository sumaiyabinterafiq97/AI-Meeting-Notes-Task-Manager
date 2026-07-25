# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.7.1] - 2026-07-26

> Ships on `main` together with **[0.7.0]** (Translate & Transcribe deferred start), which was never tagged separately.

### Added

- **Meeting chat corpus fallback** — when hybrid/keyword retrieval returns no chunks for meeting-scoped `synthesis` / `general` / `meeting_query` intents, load that meeting’s indexed chunks (summary → transcript preferred) so questions like “Summarize this meeting” and “Give me an overview” work without keyword overlap
- `vector.repository.listByMeeting` for ordered meeting corpus listing
- Unit tests for corpus-fallback gates, meeting-scoped synthesis RAG hints, and process-meeting embed ordering
- Backend tests **412**; frontend **84**

### Changed

- Meeting-scoped **synthesis** retrieval prefers `transcript` + `summary` source types (hybrid mode unchanged)
- `process-meeting` runs **knowledge extraction before** `enqueueEmbedMeeting` (still embeds if knowledge fails)
- Meeting re-embed (`replaceMeetingChunks`) **preserves `KNOWLEDGE` chunks** so knowledge vectors are not wiped when transcript/summary are refreshed
- Embedding cache unit test clears Redis keys so local Redis no longer flakes the suite

### Fixed

- Meeting chat empty-context refusals on summarize/overview-style questions despite a Ready transcript
- Stale TRANSCRIPT/SUMMARY RAG index after re-transcribe when embed raced ahead of (or skipped) knowledge

## [0.7.0] - 2026-07-21

### Added

- **Translate & Transcribe** — `POST …/transcription/start` with modes `translate_to_english` (default, Whisper translations) and `transcribe_original`
- Upload response fields `processingStarted` and optional `audio` DTO; meeting detail returns `transcript.content` and `audio` for UI banners
- Video audio extraction runs on **start/job**, not on upload
- Integration tests for store-only upload, start pipeline, replace-without-auto-process, and busy 409s
- Requirements rewrite: FR-MTG-017–023, user stories MTG-02b/02c/08, MVP definition v1.2, roadmap Phase 8

### Changed

- `POST …/meetings/:id/audio` returns **201** and only stores media (`DRAFT` / audio `PENDING`) — no Whisper or AI enqueue
- Replace recording resets toward `DRAFT`; user must click Translate & Transcribe again
- Screen recorder / AudioUpload UX: upload then explicit start button
- Docs trimmed: removed one-shot QA snapshots and legacy duplicate architecture/SRS files; index and capture docs aligned to deferred-start flow

### Removed

- Auto-start transcription on upload (previous 202 behavior)

## [0.6.0] - 2026-07-20

### Added

- **Google Sign-In** — OAuth flow (`GET /auth/google`), account linking, optional mock (`GOOGLE_AUTH_USE_MOCK`); `AuthProvider` enum and nullable password hash
- **Capture layer** — Zoom, Google Meet, and Teams import API stubs with handoff to transcription; `MeetingImport` model and platform import routes
- **Video capture** — Screen recording upload (mp4/webm), ffmpeg/mock audio extraction, higher `VIDEO_MAX_BYTES` limit
- **Transcription hardening** — observability metrics, BullMQ transcribe jobs, per-attempt AI pipeline idempotency after audio
- **Google Meet & Calendar** — Meet URLs on sync, create calendar event with Meet link, `Join Meet` UI, workspace calendar connect card
- **Meeting reminders** — in-app `MEETING_STARTING_SOON` notifications (`MEETING_START_REMINDER_MINUTES`)
- **Meetings needing transcript** — list API and frontend banner for upload/import follow-up
- Frontend: `ScreenRecorder`, `AudioUpload`, Google callback page, transcription status banner
- Docs: capture architecture, transcription flow, Google Meet / Zoom / Teams integration guides; portfolio demo seed (`npm run seed:portfolio-demo`)

### Changed

- Shared Google OAuth client config for Sign-In and Calendar (`GOOGLE_OAUTH_*` with calendar fallback)
- Meeting detail and list UX for capture sources, Meet metadata, and upload flows
- `.gitignore` excludes local demo screenshots and `screen-capture.webm`

## [0.5.0] - 2026-06-29

### Added

- **LangGraph orchestrator** — meeting-intelligence, chat, weekly-report, and knowledge-update workflows (`AI_PIPELINE_MODE=multi-agent`)
- Agent validators, v2.1 extended schemas (`PROMPT_SCHEMA_V2_1`), and output normalizer for backward-compatible DB merge
- Chat memory with Redis-backed session store, rolling summarization, and query intent classifier
- Optional agent tool calling (`CHAT_TOOLS_ENABLED`) with SearchMeetings, SearchTasks, and related tools
- RAG pipeline upgrades: chunking strategy registry, hybrid search, score-boost reranker, citation parsing, embedding reindex
- Production observability layer: dashboards, alerts, latency percentiles, cache/retry/rate-limit tracking
- `/observability` API routes (Prometheus metrics, dashboard, alert evaluation) with optional API key auth
- Prompt eval runner (`npm run eval:prompts`) and meeting job load test (`npm run load:test:meetings`)
- RISK `DocumentSourceType` migration for risk vector chunks
- `backend/README.md` and 14 QA/performance docs (observability design, security audit, load test reports)
- Backend test suite expanded to 370 tests across orchestrator, observability, RAG, and security

### Changed

- Chat agent v2 with intent-based retrieval routing and conversation memory compression
- Legacy pipeline orchestrator delegates to LangGraph when `AI_PIPELINE_MODE=multi-agent`
- Root README rebranded to MeetingMind AI platform with LangGraph in tech stack
- `.gitignore` excludes `backend/storage/` test artifacts and `career/` personal notes

## [0.4.0] - 2026-06-19

### Added

- **MeetingMind AI** — pgvector-backed RAG chat, semantic/hybrid search, insights hub, weekly reports, and knowledge base
- Multi-LLM provider layer (OpenAI, Anthropic, Gemini, mock) with fallback chain, circuit breaker, and retries
- Document chunking, embedding pipeline, and vector retrieval with reciprocal rank fusion
- Multi-agent orchestration: summarizer, task extractor, risk analyzer, decision agent, weekly report agent
- Workspace chat with SSE streaming and meeting-scoped chat sessions
- Insights, reports, and knowledge base APIs with dashboard AI recommendations
- Audio transcription upload jobs and Google/Microsoft calendar OAuth with sync
- LLM observability: invocation logging, daily usage aggregates, and cost tracking
- Redis service in Docker Compose; pgvector-enabled PostgreSQL image
- Frontend AI routes: Chat, Search, Insights, Reports, Knowledge with lazy loading and code-splitting
- Dashboard AI metrics, recommendations, and tasks-due-soon surfaces
- ~19 architecture docs (`rag-architecture.md`, `llm-architecture.md`, `agent-flow.md`, etc.)
- Backend prompt registry with evaluation fixtures; expanded test suites (136 backend, 81 frontend tests)

### Changed

- Search upgraded to semantic/hybrid mode with dedicated search page, filters, and snippet cards
- Meeting detail enriched with AI insights panel and meeting chat
- Workspace navigation expanded for desktop and mobile (Chat, Insights, Search, Reports, Knowledge)
- `AI_USE_MOCK=true` continues to support local dev without external LLM keys

## [0.3.0] - 2026-06-18

### Added

- Frontend auth: login, register, password reset, silent session restore, token refresh
- Workspaces UI: list, create, switcher, settings, member management, invitation accept
- Meetings UI: CRUD, transcript upload, AI processing status, action item review
- Tasks UI: Kanban board, task detail, comments with @mentions, drag-and-drop
- Dashboard: workspace stats, productivity chart, activity feed
- Global and mobile workspace search
- In-app notifications bell and notification preferences page
- Responsive mobile navigation (bottom tab bar, slide-over menu)
- Shared UI components: FormField, MentionTextarea, SlideOver, dialog primitives
- Frontend Vitest suite expanded to 51 tests across feature modules
- Frontend README with per-feature routes and user flows

### Changed

- Migrated from placeholder pages to feature-based architecture under `src/features/`
- API client now handles 401 refresh with request queuing and unauthorized callback
- App layout wired with workspace switcher, search, notifications, and sign out
- Root README updated for full-stack MVP status

### Removed

- v0.1.0 scaffold placeholder pages in `src/pages/`
- Unused `auth.service.ts` stub

## [0.2.0] - 2026-06-16

### Added

- JWT authentication with refresh token rotation, password reset, and rate limiting
- Workspace CRUD, member management, and email invitation flow
- Meeting management with transcript upload and storage
- AI processing pipeline: OpenAI integration, BullMQ job queue, mock mode for local dev
- Action item suggestions with accept/reject and task conversion
- Task management with kanban status, status history, comments, and @mentions
- In-app notifications and user notification preferences
- Workspace dashboard metrics and cross-entity search
- User profile and preference endpoints
- 85 backend integration and unit tests

### Changed

- Auth endpoints now fully functional (previously returned 501)
- `authenticate` middleware performs real JWT verification
- Redis optional for local development via `AI_USE_MOCK=true`
- API design documentation updated to v1.1

## [0.1.0] - 2026-06-15

### Added

- Project documentation: README, architecture, API design, database schema, and requirements (`docs/`)
- Monorepo root tooling: Husky, lint-staged, Prettier, concurrent dev scripts
- Docker Compose stack: PostgreSQL 16, backend, frontend with hot reload
- Backend Express 5 API scaffold with health endpoint and middleware stack
- Auth module scaffold: register/login/logout routes with request validation
- Prisma ORM schema and initial migration for full domain model
- Frontend React 19 SPA with Vite, Tailwind CSS 4, and Shadcn UI
- Route guards, auth layouts, and workspace-scoped placeholder pages
- Axios API client with bearer token interceptor foundation
- Jest (backend) and Vitest (frontend) test suites
