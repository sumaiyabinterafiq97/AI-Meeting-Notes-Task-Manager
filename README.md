# MeetingMind AI — LLM-Powered Multi-Agent Meeting Intelligence Platform

MeetingMind AI is a production-grade SaaS platform that transforms meeting transcripts into structured intelligence — summaries, decisions, action items, risks, and knowledge — through **multi-agent orchestration**, **RAG-powered chat**, and **semantic search**. Teams collaborate in workspace-scoped environments with task management, insights, reports, and real-time AI assistance.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS, Shadcn UI, React Hook Form, Zod, React Markdown |
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM, JWT, bcrypt |
| **LLM** | OpenAI SDK, Anthropic SDK, Google Gemini, LangChain, LangGraph, multi-provider fallback chain |
| **RAG & Search** | pgvector, document chunking, hybrid retrieval (vector + FTS), reciprocal rank fusion |
| **Agents** | Summarizer, task extractor, decision, risk analyzer, chat, knowledge, weekly report |
| **Jobs & Cache** | BullMQ, Redis (ioredis), background workers, SSE streaming |
| **Database** | PostgreSQL 16 + pgvector |
| **Observability** | Pino logging, token/cost tracking, LLM invocation metrics |
| **DevOps** | Docker, Docker Compose |
| **Code Quality** | ESLint, Prettier, Husky, lint-staged |
| **Testing** | Vitest (frontend), Jest + Supertest (backend), prompt eval fixtures |

## Project Structure

```
meetingmind-ai/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── app/              # App shell, providers
│   │   ├── components/       # Shared UI (Shadcn) + common
│   │   ├── features/         # auth, workspaces, meetings, tasks, chat, search, insights…
│   │   ├── hooks/            # Shared React hooks
│   │   ├── layouts/          # AppLayout, AuthLayout, mobile nav
│   │   ├── lib/              # API client, utils, constants
│   │   ├── routes/           # Router config + guards
│   │   ├── store/            # Client state
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   ├── Dockerfile
│   └── package.json
├── backend/                  # Express API
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Prisma migrations (incl. pgvector)
│   ├── prompts/              # Versioned agent prompt templates
│   ├── src/
│   │   ├── config/           # Env, database, CORS, Redis
│   │   ├── middlewares/      # Auth, validation, error handling
│   │   ├── modules/
│   │   │   ├── llm/          # Multi-provider LLM abstraction
│   │   │   ├── chat/         # SSE chat, session memory
│   │   │   ├── rag/          # Retrieval, context, prompt builders
│   │   │   ├── embeddings/   # Embedding generation & reindex
│   │   │   ├── vector/       # pgvector search & hybrid retrieval
│   │   │   ├── agents/       # Summarizer, task, decision, risk, chat…
│   │   │   ├── orchestrator/ # LangGraph multi-agent pipeline
│   │   │   ├── jobs/         # BullMQ queues & processors
│   │   │   ├── observability/# Metrics, cost, token monitoring
│   │   │   └── …             # auth, workspaces, meetings, tasks, etc.
│   │   ├── routes/           # Route aggregation
│   │   └── jobs/             # Worker entrypoint
│   ├── tests/                # Jest tests
│   ├── Dockerfile
│   └── package.json
├── docs/                     # Architecture & requirements
├── docker-compose.yml        # Postgres (pgvector), Redis, backend, frontend
├── .env.example              # Environment template
└── package.json              # Root scripts + Husky
```

## Prerequisites

- Node.js 22+
- npm 10+
- Docker & Docker Compose (for containerized development)
- PostgreSQL 16 (if running without Docker)

## Local Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env with your secrets (JWT secrets must be ≥ 32 characters)
```

### 2. Install dependencies

```bash
# Root (Husky + lint-staged)
npm install

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 3. Database setup

**Option A — Docker (recommended):**

```bash
docker compose up postgres redis -d
```

**Option B — Local PostgreSQL:**

Ensure PostgreSQL is running and `DATABASE_URL` in `.env` points to your instance.

### 4. Run Prisma migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 5. Start development servers

```bash
# From project root — runs frontend + backend concurrently
npm run dev

# Or individually:
cd frontend && npm run dev    # http://localhost:5173
cd backend && npm run dev     # http://localhost:3001
```

## Docker Setup

Run the full stack (frontend, backend, PostgreSQL with pgvector, Redis):

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| PostgreSQL (pgvector) | localhost:5432 |
| Redis | localhost:6379 |

## Environment Variables

See [`.env.example`](./.env.example) for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret (≥ 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (≥ 32 chars) |
| `VITE_API_URL` | Frontend API base URL |
| `CORS_ORIGIN` | Allowed frontend origin |
| `API_PORT` | Backend server port (default: 3001) |
| `REDIS_URL` | Redis connection for BullMQ workers (optional with `AI_USE_MOCK=true`) |
| `OPENAI_API_KEY` | OpenAI API key (optional with mock mode) |
| `LLM_PRIMARY_PROVIDER` | Primary LLM provider (`openai`, `google`, `anthropic`, `mock`) |
| `EMBEDDING_MODEL` | Embedding model for semantic search (default: `text-embedding-3-small`) |
| `AI_USE_MOCK` | Run AI inline without Redis/OpenAI (`true` for local dev) |
| `AI_PIPELINE_MODE` | `monolithic` or `multi-agent` extraction pipeline |
| `PROMPT_SCHEMA_V2_1` | Enable extended agent output schemas with confidence scores |

See [backend/README.md](./backend/README.md) for LLM agents, tools, memory, and testing details.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend in dev mode |
| `npm run build` | Build both apps for production |
| `npm run lint` | Lint frontend and backend |
| `npm run test` | Run all tests |
| `npm run eval:prompts` | Run prompt fixture eval (`--mock` default) |
| `npm run load:test:meetings` | Concurrent meeting AI job load test |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | tsx watch dev server |
| `npm run build` | TypeScript compile |
| `npm run test` | Jest tests |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:studio` | Prisma database GUI |

## API Endpoints

**MeetingMind AI v0.4.0** — see [`docs/api-design.md`](./docs/api-design.md) for core API reference, [`docs/rag-architecture.md`](./docs/rag-architecture.md) for AI architecture, and [`frontend/README.md`](./frontend/README.md) for UI routes.

| Domain | Base Path | Backend | Frontend |
|--------|-----------|---------|----------|
| Health | `GET /health` | ✅ | — |
| Auth | `/api/v1/auth/*` | ✅ | ✅ |
| Users | `/api/v1/users/*` | ✅ | ✅ |
| Workspaces | `/api/v1/workspaces/*` | ✅ | ✅ |
| Invitations | `/api/v1/invitations/*` | ✅ | ✅ |
| Meetings | `/api/v1/workspaces/:id/meetings/*` | ✅ | ✅ |
| AI processing | `.../meetings/:id/ai/*` | ✅ | ✅ |
| Audio transcription | `.../meetings/:id/audio/*` | ✅ | ✅ |
| Tasks | `/api/v1/workspaces/:id/tasks/*` | ✅ | ✅ |
| Notifications | `/api/v1/notifications/*` | ✅ | ✅ |
| Dashboard | `/api/v1/workspaces/:id/dashboard` | ✅ | ✅ |
| Search (keyword + semantic) | `/api/v1/workspaces/:id/search` | ✅ | ✅ |
| Chat (SSE) | `/api/v1/workspaces/:id/chat/*` | ✅ | ✅ |
| Insights | `/api/v1/workspaces/:id/insights/*` | ✅ | ✅ |
| Reports | `/api/v1/workspaces/:id/reports/*` | ✅ | ✅ |
| Knowledge | `/api/v1/workspaces/:id/knowledge/*` | ✅ | ✅ |
| Calendar OAuth | `/api/v1/calendar/oauth/*` | ✅ | — |
| Calendar sync | `/api/v1/workspaces/:id/calendar/*` | ✅ | — |

**Auth highlights:** register, login, logout, refresh (httpOnly cookie), forgot/reset password, `GET /auth/me`

**AI dev mode:** set `AI_USE_MOCK=true` in `.env` to run without Redis or external LLM keys locally. Semantic search requires pgvector migrations applied.

## Database Models

Prisma models: `User`, `RefreshToken`, `PasswordResetToken`, `Workspace`, `WorkspaceMember`, `WorkspaceInvitation`, `Meeting`, `MeetingTranscript`, `MeetingAiOutput`, `ActionItemSuggestion`, `AiProcessingJob`, `Task`, `TaskStatusHistory`, `Comment`, `Notification`, `NotificationPreference`, `ActivityLog`, `DocumentChunk`, `EmbeddingJob`, `LlmInvocation`, `LlmUsageDaily`, `AgentExecution`, `ChatSession`, `ChatMessage`, `KnowledgeEntry`, `WorkspaceReport`, `MeetingAudio`, `CalendarConnection`, `CalendarSyncedEvent`.

See [`docs/erd.md`](./docs/erd.md) and [`docs/database-architecture.md`](./docs/database-architecture.md) for the full schema design.

## Documentation

Full architecture and requirements live in [`docs/`](./docs/):

- [requirements.md](./docs/requirements.md) — Product vision, personas, RBAC
- [system-architecture.md](./docs/system-architecture.md) — Canonical architecture
- [api-design.md](./docs/api-design.md) — REST API reference
- [rag-architecture.md](./docs/rag-architecture.md) — RAG and semantic search design
- [llm-architecture.md](./docs/llm-architecture.md) — Multi-provider LLM layer
- [agent-flow.md](./docs/agent-flow.md) — Multi-agent orchestration
- [project-structure.md](./docs/project-structure.md) — Detailed folder conventions

## Next Steps

MeetingMind AI v0.4.0 is feature-complete. Recommended next phase:

1. **E2E tests** — Playwright flows for chat, semantic search, and meeting AI pipeline
2. **Email delivery** — Wire invitation and password-reset emails (Resend; `EMAIL_API_KEY`)
3. **Production deploy** — Redis + pgvector in production, secrets management, CI/CD
4. **Calendar UI** — Frontend surfaces for calendar connect/sync and transcript reminders
5. **Polish** — Prompt evaluation runner, reranker integration, API design doc v1.2

## License

Private — All rights reserved.
