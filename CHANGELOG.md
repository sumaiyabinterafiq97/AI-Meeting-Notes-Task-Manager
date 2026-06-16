# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] - 2026-06-15

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
