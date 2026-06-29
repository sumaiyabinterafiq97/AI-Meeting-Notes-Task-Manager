# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

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
